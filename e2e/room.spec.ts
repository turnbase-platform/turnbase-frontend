import { expect, test } from "./fixtures";
import type { Page } from "@playwright/test";
import {
  awaitRefilledBudgets,
  createRoom,
  gameFrame,
  leaveQuietly,
  login,
  newPlayer,
  playCell,
  TTT_TITLE,
} from "./support";

// IMP-M8-10: /rooms/:id in its three states and four roles — host `alice`, player `bob`,
// spectator `carol`, and non-member `dave` (VW-RLOBBY, VW-RGAME, VW-RRESULT, VW-JOIN-002,
// IMP-GATE-95). The drop-and-resume and the forfeit are in resilience.spec.ts.

test.beforeEach(awaitRefilledBudgets);
test.setTimeout(150_000);

/** Polled: a resize reaches the header's narrow layout one frame after the viewport changes. */
const expectNoHorizontalScroll = (page: Page) =>
  expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);

test("lobby → game → results for host, player, spectator and an outsider", async ({ browser }) => {
  const a = await newPlayer(browser, "alice");
  const b = await newPlayer(browser, "bob");
  const c = await newPlayer(browser, "carol");
  const d = await newPlayer(browser, "dave");
  let roomId: string | undefined;
  try {
    for (const [p, name] of [
      [a, "alice"],
      [b, "bob"],
      [c, "carol"],
      [d, "dave"],
    ] as const) {
      await login(p, name);
    }
    roomId = await createRoom(a, { spectating: true });
    const players = a.page.getByRole("list", { name: "Players" });

    // The outsider is asked, and holds no seat until a button is pressed (IMP-GATE-95).
    await d.page.goto(`/rooms/${roomId}`);
    await expect(d.page.getByRole("button", { name: "Join as player" })).toBeVisible();
    await expect(d.page.getByRole("button", { name: "Join as spectator" })).toBeVisible();
    await d.page.waitForTimeout(1_500);
    await expect(players.getByRole("listitem")).toHaveCount(1);
    await expect(a.page.getByRole("list", { name: "Spectators" })).toBeHidden();

    // A player and a spectator choose their role.
    await b.page.goto(`/rooms/${roomId}`);
    await b.page.getByRole("button", { name: "Join as player" }).click();
    await c.page.goto(`/rooms/${roomId}`);
    await c.page.getByRole("button", { name: "Join as spectator" }).click();
    await expect(players.getByRole("listitem")).toHaveCount(2);

    // Host: Start is present but disabled, with the reason; bob has no host controls.
    const start = a.page.getByRole("button", { name: "Start game" });
    await expect(start).toBeDisabled();
    await expect(a.page.getByText("bob is not ready.")).toBeVisible();
    await expect(a.page.getByRole("button", { name: "Kick bob" })).toBeVisible();
    await expect(a.page.getByRole("button", { name: "Transfer host to bob" })).toBeVisible();
    await expect(b.page.getByRole("button", { name: /^(Start game|Kick|Transfer)/ })).toHaveCount(
      0,
    );
    // No team channel in a one-seat-per-team game; players chat, the spectator does not.
    await expect(a.page.getByRole("radio", { name: "Team" })).toHaveCount(0);
    await expect(a.page.getByRole("heading", { name: "Room chat" })).toBeVisible();
    await expect(c.page.getByRole("heading", { name: "Room chat" })).toHaveCount(0);
    await expect(c.page.getByRole("button", { name: "Switch to player" })).toHaveCount(0); // full
    await expect(c.page.getByRole("list", { name: "Players" })).toBeVisible();

    // 400 px: the lobby stays inside the viewport.
    await a.page.setViewportSize({ width: 400, height: 800 });
    await expectNoHorizontalScroll(a.page);
    await a.page.setViewportSize({ width: 1280, height: 800 });

    await b.page.getByRole("switch", { name: "I am ready" }).click();
    await expect(start).toBeEnabled();
    await start.click();
    for (const p of [a, b, c]) {
      await expect(gameFrame(p.page).locator("[data-cell]")).toHaveCount(9);
    }
    await expect(c.page.getByRole("heading", { name: "Room chat" })).toHaveCount(0);

    // A refresh mid-game rejoins from a snapshot — the game, not the lobby.
    await playCell([a, b], 0);
    for (const p of [b, c]) {
      await p.page.reload();
      // A spectator is dropped by the disconnect and "re-joins freely" (FR-DC-003): through the
      // same prompt as any visitor. A player holds a grace-period slot and resumes directly.
      if (p === c) await p.page.getByRole("button", { name: "Join as spectator" }).click();
      await expect(gameFrame(p.page).locator("[data-cell]")).toHaveCount(9);
      await expect(p.page.getByRole("button", { name: /^(Start game|Ready)/ })).toHaveCount(0);
      await expect(gameFrame(p.page).locator('[data-cell="0"]')).not.toHaveText("");
    }
    await expect(a.page.getByText("Disconnected")).toBeHidden({ timeout: 30_000 });

    // Play out a win: X takes the top row.
    for (const cell of [3, 1, 4, 2]) {
      await playCell([a, b], cell);
      // Both boards must show the move before the next mover is picked.
      for (const p of [a, b]) {
        await expect(gameFrame(p.page).locator(`[data-cell="${String(cell)}"]`)).not.toHaveText("");
      }
    }

    // Results: the board stays, and the controls are reachable at 400 px.
    for (const p of [a, b, c]) {
      await expect(p.page.getByText("The game is over.")).toBeVisible();
      await expect(gameFrame(p.page).locator("[data-cell]")).toHaveCount(9);
      await expect(p.page.getByRole("button", { name: "Return to lobby" })).toBeVisible();
      await expect(p.page.getByRole("button", { name: "Leave room" })).toBeVisible();
    }
    await b.page.setViewportSize({ width: 400, height: 800 });
    await expectNoHorizontalScroll(b.page);
    // Reachable: the page scrolls vertically to it, and nothing covers it once there.
    const leave = b.page.getByRole("button", { name: "Leave room" });
    await leave.scrollIntoViewIfNeeded();
    await expect(leave).toBeInViewport();
    const box = await leave.boundingBox();
    expect(box && box.x >= 0 && box.x + box.width <= 400).toBe(true);
    await a.page.getByRole("button", { name: "Return to lobby" }).click();
    await expect(a.page.getByRole("button", { name: "Start game" })).toBeVisible();
    // A Lobby refresh is an immediate leave (FR-DC-002), so the way back is the prompt, not a seat.
    await a.page.reload();
    await a.page.getByRole("button", { name: "Join as player" }).click();
    await expect(a.page.getByRole("heading", { name: "Players" })).toBeVisible();
  } finally {
    await leaveQuietly([a, b, c, d], roomId);
  }
});

// IMP-M9-11 / FR-DC-008: a Lobby reload is an immediate leave, so the browser asks first — and
// stops asking once the player has left on purpose.
test("a reload in the Lobby asks for confirmation, and not after Leave room", async ({
  browser,
}) => {
  const a = await newPlayer(browser, "alice");
  let roomId: string | undefined;
  try {
    await login(a, "alice");
    roomId = await createRoom(a);

    const dialogs: string[] = [];
    a.page.on("dialog", (dialog) => {
      dialogs.push(dialog.type());
      void dialog.accept();
    });

    // Chromium only shows the prompt for a page the user has interacted with.
    await a.page.getByRole("heading", { level: 1, name: TTT_TITLE }).click();
    await a.page.reload();
    expect(dialogs).toEqual(["beforeunload"]);

    // The reload dropped the seat — and, for a sole host, closed the room (FR-DC-008): start over.
    roomId = await createRoom(a);
    const leave = a.page.getByRole("button", { name: "Leave room" });
    await a.page.getByRole("heading", { level: 1, name: TTT_TITLE }).click();
    await leave.click();
    await expect(a.page).toHaveURL(/\/rooms$/);
    await a.page.getByRole("heading", { level: 1 }).first().click();
    await a.page.reload();
    expect(dialogs).toEqual(["beforeunload"]);
  } finally {
    await leaveQuietly([a], roomId);
  }
});
