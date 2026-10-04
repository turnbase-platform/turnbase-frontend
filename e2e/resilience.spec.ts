import { expect, test } from "./fixtures";
import {
  awaitRefilledBudgets,
  createRoom,
  dropSocket,
  enterFromList,
  gameFrame,
  leaveQuietly,
  login,
  newPlayer,
  playCell,
  readyAndStart,
} from "./support";

test.beforeEach(awaitRefilledBudgets);

// The seeded users carry these specs; each test leaves its room so the next starts room-free
// (a user may sit in only one room at a time).

test("a mid-game socket drop resumes with the board intact", async ({ browser }) => {
  const a = await newPlayer(browser, "alice");
  const b = await newPlayer(browser, "bob");
  let roomId: string | undefined;
  try {
    await login(a, "alice");
    await login(b, "bob");
    roomId = await createRoom(a);
    await enterFromList(b, "alice", "Join");
    await readyAndStart(a, b);

    await playCell([a, b], 0);
    await expect(gameFrame(b.page).locator('[data-cell="0"]')).not.toHaveText("");

    // A network failure on bob's side: the platform sees a lost socket, not a leave.
    expect(await dropSocket(b.page)).toBeGreaterThan(0);
    await expect(a.page.getByText("Disconnected")).toBeVisible();

    // Bob reconnects on his own, the badge clears, and the game carries on from the same board.
    await expect(a.page.getByText("Disconnected")).toBeHidden({ timeout: 30_000 });
    await expect(gameFrame(b.page).locator('[data-cell="0"]')).not.toHaveText("");
    await playCell([a, b], 3);
    await expect(gameFrame(a.page).locator('[data-cell="3"]')).not.toHaveText("");
  } finally {
    await leaveQuietly([a, b], roomId);
  }
});

test("leaving mid-game forfeits: the opponent is told and can return to the lobby", async ({
  browser,
}) => {
  const a = await newPlayer(browser, "alice");
  const b = await newPlayer(browser, "bob");
  let roomId: string | undefined;
  try {
    await login(a, "alice");
    await login(b, "bob");
    roomId = await createRoom(a);
    await enterFromList(b, "alice", "Join");
    await readyAndStart(a, b);
    await playCell([a, b], 0);

    await a.page.getByRole("button", { name: "Leave room" }).click();
    await expect(a.page).toHaveURL(/\/rooms$/);

    // The game is not stuck: bob sees it end and can return to the lobby.
    await expect(b.page.getByText("The game is over.")).toBeVisible();
    await b.page.getByRole("button", { name: "Return to lobby" }).click();
    await expect(b.page.getByRole("button", { name: "Start game" })).toBeVisible();
  } finally {
    await leaveQuietly([a, b], roomId);
  }
});

test("a Lobby abandoned by its host disappears from the list", async ({ browser }) => {
  const host = await newPlayer(browser, "carol");
  const watcher = await newPlayer(browser, "alice");
  try {
    await login(host, "carol");
    await login(watcher, "alice");
    await createRoom(host);
    await watcher.page.goto("/rooms");
    const row = watcher.page.getByRole("button", { name: "Join Tic-Tac-Toe hosted by carol" });
    await expect(async () => {
      await watcher.page.getByRole("button", { name: "Refresh" }).click();
      await expect(row).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 20_000 });

    // The host's browser goes away: the last human loses their socket in the Lobby.
    await host.context.close();

    await expect(async () => {
      await watcher.page.getByRole("button", { name: "Refresh" }).click();
      await expect(row).toBeHidden({ timeout: 2_000 });
    }).toPass({ timeout: 30_000 });
  } finally {
    await watcher.context.close();
  }
});

// Three game attaches in under 30 s for one user: the start itself, then two reloads. Each attach
// is a REQUEST_GAME_SYNC and a REQUEST_ROOM_STATE against a `snapshot` bucket of burst 2 refilling
// 1 per 3 s (`rate-limiting.md` Tier 6), so frames are dropped with RATE_LIMIT_EXCEEDED. The client
// retries after a back-off and the board still renders without a manual reload.
test("a game attach dropped by the rate limiter recovers on its own", async ({ browser }) => {
  const a = await newPlayer(browser, "alice");
  const b = await newPlayer(browser, "bob");
  let roomId: string | undefined;
  try {
    await login(a, "alice");
    await login(b, "bob");
    roomId = await createRoom(a);
    await enterFromList(b, "alice", "Join");
    await readyAndStart(a, b);

    // The limiter tells a client about a drop at most once a second and not at all when the
    // `SUBSCRIBE` of the error queue was itself dropped, so the evidence is the client's own
    // retry: more `REQUEST_GAME_SYNC` frames than the two reloads alone would send.
    let syncs = 0;
    b.page.on("websocket", (socket) => {
      socket.on("framesent", (frame) => {
        if (String(frame.payload).includes(".sync")) syncs += 1;
      });
    });
    for (let i = 0; i < 2; i += 1) {
      await b.page.reload();
      await expect(gameFrame(b.page).locator("[data-cell]")).toHaveCount(9, { timeout: 45_000 });
    }
    expect(syncs).toBeGreaterThan(2);
    await playCell([a, b], 0);
    await expect(gameFrame(b.page).locator('[data-cell="0"]')).not.toHaveText("");
  } finally {
    await leaveQuietly([a, b], roomId);
  }
});
