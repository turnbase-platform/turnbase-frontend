import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import {
  awaitRefilledBudgets,
  createRoom,
  enterFromList,
  leaveQuietly,
  login,
  newPlayer,
  playCell,
  readyAndStart,
  tripwire,
  type Player,
} from "./support";

// IMP-M8-16: the scenarios the MVP regression review left uncovered — a forfeit's record, the
// grace period's length, the Tier 6 flood and its recovery, and two members leaving at once.
// Seeded users only: a registration and a guest are spent sparingly (see `support.ts`).

interface HistoryPage {
  content: { gameName: string; outcomeLabel: string }[];
}

const played = async (p: Player, username: string): Promise<number> =>
  (
    (await (await p.page.request.get(`/api/users/${username}/statistics`)).json()) as {
      totalPlayed: number;
    }
  ).totalPlayed;

const lastOutcome = async (p: Player, username: string): Promise<string | undefined> =>
  ((await (await p.page.request.get(`/api/users/${username}/history`)).json()) as HistoryPage)
    .content[0]?.outcomeLabel;

test.describe("mid-game departures", () => {
  test.setTimeout(150_000);
  test.beforeEach(awaitRefilledBudgets);

  test("a forfeit is recorded: a Victory and a Defeat in history, one more game in the statistics", async ({
    browser,
  }) => {
    const a = await newPlayer(browser, "alice");
    const b = await newPlayer(browser, "bob");
    let roomId: string | undefined;
    try {
      await login(a, "alice");
      await login(b, "bob");
      const before = { alice: await played(a, "alice"), bob: await played(b, "bob") };

      roomId = await createRoom(a);
      await enterFromList(b, "alice", "Join");
      await readyAndStart(a, b);
      await playCell([a, b], 0);

      await a.page.getByRole("button", { name: "Leave room" }).click();
      await expect(a.page).toHaveURL(/\/rooms$/);
      await expect(b.page.getByText("The game is over.")).toBeVisible();

      // RR-03: the leaver is gone from the room, and the outcome must still reach both records.
      await expect.poll(() => lastOutcome(b, "bob"), { timeout: 20_000 }).toBe("Victory");
      await expect.poll(() => lastOutcome(a, "alice"), { timeout: 20_000 }).toBe("Defeat");
      await expect.poll(() => played(b, "bob")).toBe(before.bob + 1);
      await expect.poll(() => played(a, "alice")).toBe(before.alice + 1);

      await b.page.goto("/users/bob");
      await expect(b.page.getByRole("heading", { level: 2, name: "Game history" })).toBeVisible();
      await expect(b.page.getByText("Victory").first()).toBeVisible();
    } finally {
      await leaveQuietly([a, b], roomId);
    }
  });

  test("a player who never returns is released after the 60 s grace period", async ({
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

      // Bob's browser disappears: the platform sees a lost socket, not a leave.
      await b.context.close();
      const lostAt = Date.now();
      await expect(a.page.getByText("Disconnected")).toBeVisible();

      // FR-GRACE: the slot is held, the game is not over, for as long as the grace period runs.
      await a.page.waitForTimeout(45_000);
      await expect(a.page.getByText("The game is over.")).toBeHidden();
      await expect(a.page.getByText("Disconnected")).toBeVisible();

      await expect(a.page.getByText("The game is over.")).toBeVisible({ timeout: 45_000 });
      const elapsed = (Date.now() - lostAt) / 1000;
      expect(elapsed, `released after ${elapsed.toFixed(1)} s`).toBeGreaterThanOrEqual(58);
      expect(elapsed, `released after ${elapsed.toFixed(1)} s`).toBeLessThanOrEqual(75);
    } finally {
      await leaveQuietly([a], roomId);
    }
  });
});

/**
 * One raw STOMP connection from inside `page`, with that page's own cookies. Resolves `connected:
 * false` when the platform refuses it (a reconnect lockout answers with a STOMP ERROR or a close).
 */
async function stompProbe(
  page: Page,
  script: { roomId: string; sends: number },
): Promise<{ connected: boolean; frames: string[]; closeCode: number | null }> {
  return page.evaluate(
    ({ roomId, sends }) =>
      new Promise((resolve) => {
        const frames: string[] = [];
        let connected = false;
        let closeCode: number | null = null;
        const ws = new WebSocket(`${location.origin.replace("http", "ws")}/ws`);
        const finish = (): void => {
          resolve({ connected, frames, closeCode });
        };
        const timer = setTimeout(() => {
          ws.close();
          finish();
        }, 12_000);
        ws.onopen = () => {
          ws.send("CONNECT\naccept-version:1.2\nheart-beat:0,0\nhost:turnbase\n\n\0");
        };
        ws.onclose = (event) => {
          closeCode = event.code;
          clearTimeout(timer);
          finish();
        };
        ws.onmessage = (event: MessageEvent<string>) => {
          const data = event.data;
          frames.push(data);
          if (data.startsWith("CONNECTED")) {
            connected = true;
            for (const dest of ["/user/queue/errors", "/user/queue/room-state"]) {
              ws.send(`SUBSCRIBE\nid:${dest}\ndestination:${dest}\n\n\0`);
            }
            for (let i = 0; i < sends; i += 1) {
              const body = JSON.stringify({
                type: "REQUEST_ROOM_STATE",
                correlationId: crypto.randomUUID(),
                payload: {},
              });
              ws.send(
                `SEND\ndestination:/app/room.${roomId}.member\ncontent-type:application/json\n\n${body}\0`,
              );
            }
            // A quiet probe has nothing to wait for but its answer.
            if (sends <= 2)
              setTimeout(() => {
                ws.close();
              }, 3_000);
          }
        };
      }),
    script,
  );
}

test.describe("Tier 6 flood", () => {
  test.setTimeout(420_000);
  test.beforeEach(awaitRefilledBudgets);

  test("a flood is told RATE_LIMIT_EXCEEDED, then cut off, locked out, and recovers", async ({
    browser,
  }) => {
    // The browser logs a refused WebSocket upgrade as an error; that is the lockout working.
    tripwire.allow(/WebSocket/);
    const d = await newPlayer(browser, "dave");
    let roomId: string | undefined;
    try {
      await login(d, "dave");
      roomId = await createRoom(d);

      const flood = await stompProbe(d.page, { roomId, sends: 40 });
      expect(flood.connected).toBe(true);
      const text = flood.frames.join("\n");
      expect(text).toContain("RATE_LIMIT_EXCEEDED");
      expect(text).toContain("RATE_LIMIT_ABUSE");
      expect(flood.closeCode, "the abusive connection is closed").not.toBeNull();

      // The next CONNECT lands inside the lockout (30 s, doubling per repeat offence within the hour).
      const locked = await stompProbe(d.page, { roomId, sends: 0 });
      expect(locked.connected).toBe(false);

      // Recovery: once the lockout lapses, a fresh connection is served again.
      await expect(async () => {
        const again = await stompProbe(d.page, { roomId: roomId ?? "", sends: 1 });
        expect(again.connected).toBe(true);
        expect(again.frames.join("\n")).toContain("ROOM_STATE");
      }).toPass({ timeout: 300_000, intervals: [5_000] });

      // And the app itself is back. The flooder's own socket went with the lockout, which in a
      // Lobby is a leave, so what is owed is that a new room can be made and entered.
      await leaveQuietly([], roomId);
      roomId = await createRoom(d);
      await expect(d.page.getByRole("list", { name: "Players" }).getByRole("listitem")).toHaveCount(
        1,
      );
    } finally {
      await leaveQuietly([d], roomId);
    }
  });
});

test("two members leaving a Lobby at the same moment leave no listed room", async ({ browser }) => {
  const a = await newPlayer(browser, "alice");
  const b = await newPlayer(browser, "bob");
  const watcher = await newPlayer(browser, "carol");
  try {
    await login(a, "alice");
    await login(b, "bob");
    await login(watcher, "carol");
    const catalog = await a.page.request.get("/api/games");
    const gameId = ((await catalog.json()) as { content: { gameId: string }[] }).content[0]?.gameId;

    // RR-04: a race between concurrent leaves, so one try proves little.
    for (let round = 0; round < 4; round += 1) {
      const created = await a.page.request.post("/api/rooms", {
        data: { gameId, visibility: "PUBLIC" },
      });
      expect(created.status()).toBe(201);
      const { roomId } = (await created.json()) as { roomId: string };
      const joined = await b.page.request.post(`/api/rooms/${roomId}/participants`, {
        data: { role: "PLAYER" },
      });
      expect(joined.ok()).toBe(true);

      const [leftA, leftB] = await Promise.all([
        a.page.request.delete(`/api/rooms/${roomId}/participants/me`),
        b.page.request.delete(`/api/rooms/${roomId}/participants/me`),
      ]);
      expect([leftA.status(), leftB.status()]).toEqual([204, 204]);

      await expect(async () => {
        const list = (await (await watcher.page.request.get("/api/rooms")).json()) as {
          content: { roomId: string }[];
        };
        expect(list.content.map((r) => r.roomId)).not.toContain(roomId);
      }).toPass({ timeout: 20_000 });
      expect((await watcher.page.request.get(`/api/rooms/${roomId}`)).status()).toBe(404);
    }
  } finally {
    for (const p of [a, b, watcher]) await p.context.close();
  }
});
