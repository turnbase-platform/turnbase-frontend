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

// IMP-M9-04 (CA-04): at desktop widths a row's actions lie inside their cell and the viewport. A
// clipped element is still clickable to Playwright, so this asserts bounding boxes, not visibility.
test("catalog rows keep their actions inside the cell and viewport at desktop widths", async ({
  browser,
}) => {
  const a = await newPlayer(browser, "alice");
  try {
    await login(a, "alice");
    for (const width of [1280, 1440, 1920]) {
      await a.page.setViewportSize({ width, height: 900 });
      await a.page.goto("/games");
      const create = a.page.getByRole("button", { name: "Create room" }).first();
      await expect(create).toBeVisible();
      const geometry = await a.page.evaluate(() => {
        const row = document.querySelector("tbody tr");
        const button = [...(row?.querySelectorAll("button") ?? [])].find(
          (b) => b.textContent === "Create room",
        );
        const cell = button?.closest("td");
        const link = row?.querySelector("a");
        const badge = row?.querySelector(".astryx-badge");
        if (!button || !cell || !link || !badge) throw new Error("catalog row is incomplete");
        const rect = (e: Element) => e.getBoundingClientRect();
        return {
          button: rect(button).toJSON() as DOMRect,
          cell: rect(cell).toJSON() as DOMRect,
          viewport: innerWidth,
          badgeClipped: [badge, ...badge.querySelectorAll("*")].some(
            (e) => e.scrollWidth > e.clientWidth,
          ),
          decoration: getComputedStyle(link).textDecorationLine,
        };
      });
      const at = `at ${String(width)} px`;
      expect(
        geometry.button.left,
        `Create room starts inside its cell ${at}`,
      ).toBeGreaterThanOrEqual(geometry.cell.left);
      expect(geometry.button.right, `Create room ends inside its cell ${at}`).toBeLessThanOrEqual(
        geometry.cell.right,
      );
      expect(
        geometry.button.right,
        `Create room ends inside the viewport ${at}`,
      ).toBeLessThanOrEqual(geometry.viewport);
      expect(geometry.badgeClipped, `the badge label is cut ${at}`).toBe(false);
      expect(geometry.decoration, `the title reads as a link ${at}`).toContain("underline");
    }

    // The detail page's button keeps its natural width.
    await a.page.setViewportSize({ width: 1280, height: 900 });
    await a.page.goto("/games");
    await a.page
      .getByRole("link", { name: /Tic-Tac-Toe/ })
      .first()
      .click();
    const detail = a.page.getByRole("button", { name: "Create room" });
    await expect(detail).toBeVisible();
    const box = await detail.boundingBox();
    expect(box?.width ?? Infinity, "the detail page's Create room is stretched").toBeLessThan(200);
  } finally {
    await a.context.close();
  }
});
