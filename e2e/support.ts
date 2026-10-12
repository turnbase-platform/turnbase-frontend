import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { expect, type Browser, type BrowserContext, type Page } from "@playwright/test";

export const TTT_TITLE = "Tic-Tac-Toe";
export const ORIGIN = process.env.PLATFORM_URL ?? "http://turnbase.localhost:8080";

export interface Player {
  name: string;
  context: BrowserContext;
  page: Page;
}

/** Wraps every WebSocket the page opens, so a spec can drop the app's own socket. */
const TRACK_SOCKETS = () => {
  const sockets: WebSocket[] = [];
  (window as unknown as { __sockets: WebSocket[] }).__sockets = sockets;
  const Native = window.WebSocket;
  window.WebSocket = class extends Native {
    constructor(url: string | URL, protocols?: string | string[]) {
      super(url, protocols);
      sockets.push(this);
    }
  };
};

/**
 * IMP-M8-16's tripwire: every console error or warning, uncaught page error and `5xx` any player's pages saw
 * during the running spec. `fixtures.ts` empties it before each test and fails the test if it is not
 * empty afterwards. A browser reports a deliberate `4xx` as a console error too, so those are not
 * counted — only a spec that provokes a `5xx` or an error on purpose needs {@link allowTripwire}.
 */
const tripped: string[] = [];
/**
 * stompjs writes a heartbeat to a socket the browser is already closing when a page navigates away
 * from a signed-in view (here: onto `/login`). It is library teardown noise, not an application
 * fault, and it raced one run in two.
 */
const teardownNoise = [/WebSocket is already in CLOSING or CLOSED state/];
let allowed: RegExp[] = [...teardownNoise];

export const tripwire = {
  reset(): void {
    tripped.length = 0;
    allowed = [...teardownNoise];
  },
  /** Whatever the spec trips on purpose, by message. */
  allow(...patterns: RegExp[]): void {
    allowed.push(...patterns);
  },
  seen(): string[] {
    return tripped.filter((message) => !allowed.some((pattern) => pattern.test(message)));
  },
};

function watch(page: Page): void {
  page.on("console", (m) => {
    if ((m.type() === "warning" || m.type() === "error") && !/status of 4\d\d/.test(m.text())) {
      tripped.push(`console.${m.type()} ${m.text()} (${page.url()})`);
    }
  });
  page.on("pageerror", (e) => {
    tripped.push(`pageerror ${e.message} (${page.url()})`);
  });
  page.on("response", (r) => {
    if (r.status() >= 500) tripped.push(`${String(r.status())} ${r.request().method()} ${r.url()}`);
  });
}

/** A fresh, isolated browser context: its own cookie jar and storage, as a separate person. */
export async function newPlayer(browser: Browser, name: string): Promise<Player> {
  const context = await browser.newContext({ baseURL: ORIGIN });
  await context.addInitScript(TRACK_SOCKETS);
  context.on("page", watch);
  return { name, context, page: await context.newPage() };
}

export function uniqueName(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

export async function register(player: Player): Promise<string> {
  const username = uniqueName("e2e");
  const { page } = player;
  await page.goto("/register");
  await page.locator('input[name="username"]').fill(username);
  await page.locator('input[name="email"]').fill(`${username}@example.test`);
  await page.locator('input[name="password"]').fill("Correct-horse-9battery");
  await page.locator('input[name="confirmPassword"]').fill("Correct-horse-9battery");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/rooms$/);
  // A new account is shown the quick tour; skipping it hands the page back.
  await page.getByRole("button", { name: "Skip tour" }).click();
  await expect(page.getByRole("dialog", { name: "Quick tour" })).toHaveCount(0);
  return username;
}

/** Logs in through the UI as one of the seeded users (`local-environment.md` §7: password `password`). */
export async function login(player: Player, username: string): Promise<void> {
  const { page } = player;
  await page.goto("/login");
  await page.locator('input[name="usernameOrEmail"]').fill(username);
  await page.locator('input[name="password"]').fill("password");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/rooms$/);
}

/**
 * Guests are minted at 5 per address per hour (Tier 5), and a run of this suite wants one in a
 * dozen specs. So the first spec to ask really presses *Play as Guest*, and every later one — in this
 * run or the next — signs in with that guest's cookie, for as long as the platform still honours it.
 */
const GUEST_CACHE = ".e2e-cache/guest-cookies.json";

export async function playAsGuest(player: Player): Promise<void> {
  const { page, context } = player;
  try {
    await context.addCookies(
      JSON.parse(readFileSync(GUEST_CACHE, "utf8")) as Parameters<BrowserContext["addCookies"]>[0],
    );
    const session = (await (await page.request.get("/api/auth/session")).json()) as {
      authenticated?: boolean;
      userId?: string;
    };
    if (session.userId) {
      await page.goto("/rooms");
      await expect(page).toHaveURL(/\/rooms$/);
      return;
    }
  } catch {
    // no cache yet, or an unreadable one: mint below
  }
  await context.clearCookies();
  await page.goto("/");
  await page.getByRole("button", { name: "Play as Guest" }).first().click();
  await expect(page).toHaveURL(/\/rooms$/);
  mkdirSync(".e2e-cache", { recursive: true });
  writeFileSync(GUEST_CACHE, JSON.stringify(await context.cookies()));
}

/** Catalog → Tic-Tac-Toe → Create room, as the host would. Returns the room id. */
export async function createRoom(
  host: Player,
  options: { spectating?: boolean; visibility?: "Friends Only" | "Invite Only" } = {},
): Promise<string> {
  const { page } = host;
  await page.goto("/games");
  await page
    .getByRole("link", { name: new RegExp(TTT_TITLE) })
    .first()
    .click();
  await page.getByRole("button", { name: "Create room" }).click();
  // FR-CREATE-001: the dialog is where visibility and spectating are chosen.
  if (options.visibility) await page.getByRole("radio", { name: options.visibility }).check();
  if (options.spectating) await page.getByRole("switch", { name: "Allow spectators" }).click();
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await expect(page).toHaveURL(/\/rooms\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { level: 1, name: TTT_TITLE })).toBeVisible();
  return roomIdOf(page);
}

export function roomIdOf(page: Page): string {
  const id = /\/rooms\/([0-9a-f-]{36})$/.exec(page.url())?.[1];
  if (!id) throw new Error(`not on a room page: ${page.url()}`);
  return id;
}

/** Finds the host's room in the public list and presses `Join` or `Spectate`. */
export async function enterFromList(
  guest: Player,
  hostName: string,
  action: "Join" | "Spectate",
): Promise<void> {
  const { page } = guest;
  await page.goto("/rooms");
  // An emptied Lobby lingers in the list for a moment; the live room is the one with its host in it.
  const button = page
    .getByRole("listitem")
    .filter({ hasText: new RegExp(`Host ${hostName}.*[1-9] / \\d`) })
    .getByRole("button", { name: `${action} ${TTT_TITLE} hosted by ${hostName}` });
  await expect(async () => {
    await page.getByRole("button", { name: "Refresh" }).click();
    await expect(button).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 20_000 });
  await button.click();
  await expect(page).toHaveURL(/\/rooms\/[0-9a-f-]{36}$/);
}

export const gameFrame = (page: Page) => page.frameLocator('iframe[title="Game"]');

/** Lobby → game: the guest readies up, the host starts. Both pages end on the game frame. */
export async function readyAndStart(host: Player, guest: Player): Promise<void> {
  await guest.page.getByRole("switch", { name: "I am ready" }).click();
  const start = host.page.getByRole("button", { name: "Start game" });
  await expect(start).toBeEnabled();
  await start.click();
  for (const p of [host, guest]) {
    await expect(gameFrame(p.page).locator("[data-cell]")).toHaveCount(9);
  }
}

/**
 * Plays `cell` for whichever of `players` has the move: the game frame disables every cell for
 * the player who is not to move, so exactly one page can click it.
 */
export async function playCell(players: Player[], cell: number): Promise<Player> {
  let mover: Player | undefined;
  await expect(async () => {
    for (const p of players) {
      const target = gameFrame(p.page).locator(`[data-cell="${String(cell)}"]`);
      if (await target.isEnabled()) {
        mover = p;
        return;
      }
    }
    throw new Error(`nobody can play cell ${String(cell)} yet`);
  }).toPass({ timeout: 15_000 });
  if (!mover) throw new Error("unreachable");
  await gameFrame(mover.page)
    .locator(`[data-cell="${String(cell)}"]`)
    .click();
  return mover;
}

/** Collects the MESSAGE frames a page's own cookie session receives on `destinations`. */
export async function listenOnTopics(page: Page, destinations: string[]): Promise<void> {
  await page.evaluate(async (dests) => {
    const frames: string[] = [];
    (window as unknown as { __outsiderFrames: string[] }).__outsiderFrames = frames;
    const ws = new WebSocket(`${location.origin.replace("http", "ws")}/ws`);
    await new Promise<void>((resolve, reject) => {
      ws.onopen = () => {
        ws.send("CONNECT\naccept-version:1.2\nheart-beat:10000,10000\nhost:turnbase\n\n\0");
      };
      ws.onerror = () => {
        reject(new Error("outsider socket failed"));
      };
      ws.onmessage = (event: MessageEvent<string>) => {
        const data = event.data;
        if (data.startsWith("CONNECTED")) {
          dests.forEach((d, i) => {
            ws.send(`SUBSCRIBE\nid:out-${String(i)}\ndestination:${d}\n\n\0`);
          });
          resolve();
        } else if (data.startsWith("MESSAGE")) {
          frames.push(data);
        }
      };
    });
  }, destinations);
}

export async function outsiderFrames(page: Page): Promise<string[]> {
  return page.evaluate(
    () => (window as unknown as { __outsiderFrames: string[] }).__outsiderFrames,
  );
}

/** Drops the app's own STOMP socket without telling the server why — a network failure. */
export async function dropSocket(page: Page): Promise<number> {
  return page.evaluate(() => {
    const sockets = (window as unknown as { __sockets: WebSocket[] }).__sockets;
    const open = sockets.filter((s) => s.readyState === WebSocket.OPEN);
    open.forEach((s) => {
      s.close();
    });
    return open.length;
  });
}

/** Best-effort cleanup: leaves whatever room `roomId` names so the next spec starts room-free. */
export async function leaveQuietly(players: Player[], roomId: string | undefined): Promise<void> {
  if (!roomId) return;
  for (const p of players) {
    await p.page.request.delete(`/api/rooms/${roomId}/participants/me`).catch(() => undefined);
    await p.context.close().catch(() => undefined);
  }
}

/**
 * Waits for the per-user Tier 6 buckets to refill (`rate-limiting.md`: `subscribe` 1/s burst 20,
 * `snapshot` 1 per 3 s burst 2). A game attach costs ~9 subscribes and 2 snapshots per player, so a
 * scenario that starts a game seconds after another one for the same seeded user would otherwise see
 * its `SUBSCRIBE`/`REQUEST_GAME_SYNC` dropped and its game frame stay blank — correct throttling,
 * not a defect,
 */
export async function awaitRefilledBudgets(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 15_000));
}

/** An element's rect is read in the page; `ancestors` lists the clipping boxes it must lie inside. */
interface Stray {
  element: string;
  left: number;
  right: number;
  limit: string;
}

/**
 * IMP-M9-09 (CA-04): every interactive element of the page lies inside the viewport and inside
 * every ancestor that clips it. A clipped element is still clickable to Playwright, so this reads
 * bounding boxes. Visually-hidden elements (a 1 px box) are skipped; vertical position is not
 * checked, since the page scrolls.
 */
export async function expectInteractiveInsideViewport(page: Page, label: string): Promise<void> {
  await settled(page);
  const strays = await page.evaluate((): Stray[] => {
    const selector =
      'a[href], button, input, select, textarea, summary, [role="button"], [role="switch"], [role="radio"], [role="tab"], [role="menuitem"], [tabindex]:not([tabindex="-1"])';
    const found: Stray[] = [];
    const describe = (e: Element) =>
      `${e.tagName.toLowerCase()}[${e.getAttribute("aria-label") ?? ""}] "${e.textContent.trim().slice(0, 30)}"`;
    for (const element of document.querySelectorAll(selector)) {
      const rect = element.getBoundingClientRect();
      if (rect.width <= 1 || rect.height <= 1) continue;
      if (getComputedStyle(element).visibility === "hidden") continue;
      const report = (limit: string) =>
        found.push({ element: describe(element), left: rect.left, right: rect.right, limit });
      if (rect.left < -0.5 || rect.right > document.documentElement.clientWidth + 0.5) {
        report(`viewport 0…${String(document.documentElement.clientWidth)}`);
        continue;
      }
      for (let p = element.parentElement; p; p = p.parentElement) {
        const overflow = getComputedStyle(p).overflowX;
        if (overflow !== "hidden" && overflow !== "clip") continue;
        const box = p.getBoundingClientRect();
        if (rect.left < box.left - 0.5 || rect.right > box.right + 0.5) {
          report(`clipped by ${describe(p)} ${String(box.left)}…${String(box.right)}`);
          break;
        }
      }
    }
    return found;
  });
  expect(strays, `${label}: interactive elements outside the viewport`).toEqual([]);
}

/**
 * Waits for the page's finite animations. A page sliding or fading in is displaced and
 * semi-transparent, so a geometry or contrast measurement taken then describes the animation.
 */
export async function settled(page: Page): Promise<void> {
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
        .map((a) => a.finished),
    ),
  );
}

/** IMP-M9-09: an axe-core pass with zero violations. `axe.source` is evaluated, so the CSP is not in the way.
 * The sandboxed game frame is a separate origin: axe would wait on it for a minute and post to it, so
 * it is left out (`iframes: false`) and the game UI's own markup is the game's to keep clean. */
export async function expectNoAxeViolations(page: Page, label: string): Promise<void> {
  const axe = (await import("axe-core")) as unknown as { default: { source: string } };
  const { source } = axe.default;
  await settled(page);
  await page.evaluate(source);
  const violations = await page.evaluate(async () => {
    const axe = (
      window as unknown as {
        axe: {
          run: (context: Document, options: object) => Promise<{ violations: AxeViolation[] }>;
        };
      }
    ).axe;
    const result = await axe.run(document, { iframes: false });
    return result.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.map((n) => n.target.join(" ")).slice(0, 5),
    }));
  });
  expect(violations, `${label}: axe violations`).toEqual([]);
}

interface AxeViolation {
  id: string;
  impact: string | null;
  nodes: { target: unknown[] }[];
}
