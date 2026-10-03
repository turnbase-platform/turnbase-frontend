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

/** A fresh, isolated browser context: its own cookie jar and storage, as a separate person. */
export async function newPlayer(browser: Browser, name: string): Promise<Player> {
  const context = await browser.newContext({ baseURL: ORIGIN });
  await context.addInitScript(TRACK_SOCKETS);
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
  await page.getByRole("button", { name: "Register" }).click();
  await expect(page).toHaveURL(/\/rooms$/);
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

export async function playAsGuest(player: Player): Promise<void> {
  const { page } = player;
  await page.goto("/");
  await page.getByRole("button", { name: "Play as Guest" }).first().click();
  await expect(page).toHaveURL(/\/rooms$/);
}

/** Catalog → Tic-Tac-Toe → Create room, as the host would. Returns the room id. */
export async function createRoom(
  host: Player,
  options: { spectating?: boolean } = {},
): Promise<string> {
  const { page } = host;
  await page.goto("/games");
  await page
    .getByRole("link", { name: new RegExp(TTT_TITLE) })
    .first()
    .click();
  await page.getByRole("button", { name: "Create room" }).click();
  // FR-CREATE-001: the dialog is where visibility and spectating are chosen.
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
    .getByRole("row", { name: new RegExp(`${hostName}.* [1-9] / \\d`) })
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
  await guest.page.getByRole("button", { name: "Ready", exact: true }).click();
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
 * not a defect, and the client does not retry.
 */
export async function awaitRefilledBudgets(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 15_000));
}
