import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import {
  awaitRefilledBudgets,
  createRoom,
  enterFromList,
  leaveQuietly,
  login,
  newPlayer,
  readyAndStart,
} from "./support";

// IMP-M8-16 (RR-07): every route of `src/app/routes.tsx` at 400 px, a phone, with no horizontal
// scroll. The page is measured once its heading is up, so a view still on "Loading…" is not
// mistaken for a narrow one.

const NARROW = { width: 400, height: 800 };

/**
 * Pass `navigate: false` inside a room: a reload drops the member's socket, and a Lobby member who
 * loses theirs has left (the host role moves on), so the page is measured where it stands.
 */
async function expectNoHorizontalScroll(page: Page, route: string, navigate = true): Promise<void> {
  if (navigate) await page.goto(route);
  await expect(page.locator("h1").first()).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(
    overflow,
    `${route} scrolls the page by ${String(overflow)} px at 400 px`,
  ).toBeLessThanOrEqual(0);
}

test("anonymous routes at 400 px do not scroll the page", async ({ browser }) => {
  const visitor = await newPlayer(browser, "visitor");
  try {
    await visitor.page.setViewportSize(NARROW);
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
      await expectNoHorizontalScroll(visitor.page, route);
    }
  } finally {
    await visitor.context.close();
  }
});

test.describe("signed in", () => {
  test.setTimeout(120_000);
  test.beforeEach(awaitRefilledBudgets);

  test("account, rooms, lobby and in-game routes at 400 px do not scroll the page", async ({
    browser,
  }) => {
    const a = await newPlayer(browser, "alice");
    const b = await newPlayer(browser, "bob");
    let roomId: string | undefined;
    try {
      await login(a, "alice");
      await login(b, "bob");
      await a.page.setViewportSize(NARROW);
      for (const route of [
        "/rooms",
        "/rooms/join/NOSUCHCODE",
        "/friends",
        "/settings",
        "/users/alice",
      ]) {
        await expectNoHorizontalScroll(a.page, route);
      }

      roomId = await createRoom(a);
      await enterFromList(b, "alice", "Join");
      await expectNoHorizontalScroll(a.page, `/rooms/${roomId} (lobby)`, false);
      await readyAndStart(a, b);
      await expectNoHorizontalScroll(a.page, `/rooms/${roomId} (in game)`, false);
    } finally {
      await leaveQuietly([a, b], roomId);
    }
  });
});
