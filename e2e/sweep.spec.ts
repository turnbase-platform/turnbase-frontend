import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import {
  awaitRefilledBudgets,
  createRoom,
  enterFromList,
  expectInteractiveInsideViewport,
  expectNoAxeViolations,
  gameFrame,
  leaveQuietly,
  login,
  newPlayer,
  playAsGuest,
  playCell,
  readyAndStart,
  type Player,
} from "./support";

// IMP-M9-09: the desktop layout pass (CA-04) and the axe-core pass (CA-09), over every route of
// `src/app/routes.tsx`, for every tier, and over each room state. Layout is checked at 1280 and
// 1920 px; axe at 1280 px (colour contrast and structure do not change with the width).

// Every route is checked in Light and in Dark, so the sweeps outlast the suite's 90 s default.
test.setTimeout(180_000);

const DESKTOP = [1280, 1920] as const;

/** The page is measured once its heading is up, so a view still on "Loading…" is not mistaken for a finished one. */
async function sweep(page: Page, label: string, navigate?: string): Promise<void> {
  if (navigate) await page.goto(navigate);
  await expect(page.locator("h1").first()).toBeVisible();
  // A settled page: no skeletons or spinners still on their way out.
  await expect(page.getByText("Loading…")).toHaveCount(0);
  for (const width of DESKTOP) {
    await page.setViewportSize({ width, height: 900 });
    await expectInteractiveInsideViewport(page, `${label} at ${String(width)} px`);
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  // Light and Dark (Appearance → Auto follows the OS), IMP-M12-11: contrast is checked in both.
  for (const colorScheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme });
    // Colours transition between appearances; axe must read the settled ones, not a midpoint.
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            document
              .getAnimations()
              .filter((a) => a instanceof CSSTransition && a.playState === "running").length,
        ),
      )
      .toBe(0);
    await expectNoAxeViolations(page, `${label} (${colorScheme})`);
  }
  await page.emulateMedia({ colorScheme: "light" });
}

test("anonymous routes: desktop layout and axe", async ({ browser }) => {
  const visitor = await newPlayer(browser, "visitor");
  try {
    const catalog = await visitor.page.request.get("/api/games");
    const gameId = ((await catalog.json()) as { content: { gameId: string }[] }).content[0]?.gameId;
    if (!gameId) throw new Error("the seeded catalog is empty");
    for (const route of [
      "/",
      "/login",
      "/register",
      "/auth/complete-registration",
      "/games",
      `/games/${gameId}`,
      "/users/alice",
      "/nope",
    ]) {
      await sweep(visitor.page, `anonymous ${route}`, route);
    }
  } finally {
    await visitor.context.close();
  }
});

const SETTINGS_TABS = ["Account", "Sign-in", "Privacy", "Appearance", "Delete account"] as const;

/** Settings shows one tab at a time, so each one is swept (IMP-M12-10). */
async function sweepSettings(page: Page, label: string): Promise<void> {
  await sweep(page, `${label} /settings`, "/settings");
  for (const tab of SETTINGS_TABS.slice(1)) {
    await page.getByRole("tab", { name: tab }).click();
    await sweep(page, `${label} /settings, ${tab}`);
  }
}

test("guest routes: desktop layout and axe", async ({ browser }) => {
  const guest = await newPlayer(browser, "guest");
  try {
    await playAsGuest(guest);
    for (const route of ["/rooms", "/rooms/join/NOSUCHCODE", "/friends", "/games"]) {
      await sweep(guest.page, `guest ${route}`, route);
    }
    // A guest is told the page needs an account: no tabs to sweep.
    await sweep(guest.page, "guest /settings", "/settings");
  } finally {
    await guest.context.close();
  }
});

test.describe("registered", () => {
  test.beforeEach(awaitRefilledBudgets);

  test("account routes and every room state: desktop layout and axe", async ({ browser }) => {
    const a = await newPlayer(browser, "alice");
    const b = await newPlayer(browser, "bob");
    const c = await newPlayer(browser, "carol");
    let roomId: string | undefined;
    try {
      await login(a, "alice");
      await login(b, "bob");
      await login(c, "carol");
      for (const route of [
        "/rooms",
        "/rooms/join/NOSUCHCODE",
        "/friends",
        "/users/alice",
        "/games",
      ]) {
        await sweep(a.page, `alice ${route}`, route);
      }
      await sweepSettings(a.page, "alice");

      roomId = await createRoom(a, { spectating: true });
      await sweep(a.page, "lobby, host alone");
      await enterFromList(b, "alice", "Join");
      await enterFromList(c, "alice", "Spectate");
      await expect(a.page.getByRole("list", { name: "Players" }).getByRole("listitem")).toHaveCount(
        2,
      );
      await sweep(a.page, "lobby, host");
      await sweep(b.page, "lobby, player");
      await sweep(c.page, "lobby, spectator");

      await readyAndStart(a, b);
      const players: Player[] = [a, b];
      await sweep(a.page, "in game, host");
      await sweep(c.page, "in game, spectator");

      for (const cell of [0, 3, 1, 4, 2]) {
        await playCell(players, cell);
        // Both frames have the mark before the next mover is looked for, or a stale one still has its turn.
        for (const p of [a, b, c]) {
          await expect(gameFrame(p.page).locator(`[data-cell="${String(cell)}"]`)).not.toHaveText(
            "",
          );
        }
      }
      for (const p of [a, b, c]) {
        await expect(p.page.getByText("The game is over.")).toBeVisible();
      }
      await sweep(a.page, "results, host");
      await sweep(b.page, "results, player");
      await sweep(c.page, "results, spectator");
    } finally {
      await leaveQuietly([a, b, c], roomId);
    }
  });
});
