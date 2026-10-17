import { describe, expect, it, vi } from "vitest";
import { FakeStompClient } from "../../test/fakeApi";
import type { ChatMessageEnvelope, RoomStateSnapshot } from "./rooms-types";
import {
  backoffDelay,
  ATTACH_WATCHDOG_MS,
  brokerUrl,
  MAX_RATE_LIMIT_RETRIES,
  openRoomConnection,
  reconcileVersion,
  type RoomSocketEnvironment,
} from "./roomSocket";

const ROOM_ID = "room-1";

function snapshot(overrides: Partial<RoomStateSnapshot> = {}): RoomStateSnapshot {
  return {
    roomId: ROOM_ID,
    state: "LOBBY",
    gameId: "g-1",
    gameName: "Chess",
    spectatingEnabled: true,
    spectatorCapacity: 4,
    hostId: "u-1",
    players: [
      {
        playerId: "u-1",
        username: "alice",
        teamId: null,
        ready: false,
        connected: true,
        joinOrder: 1,
      },
    ],
    aiPlayers: [],
    spectators: [],
    teams: [],
    parameters: {},
    disconnectedPlayers: [],
    sessionId: null,
    gameFrontendUrl: null,
    ...overrides,
  };
}

function harness() {
  FakeStompClient.reset();
  const timers: { callback: () => void; delayMs: number; cleared: boolean }[] = [];
  const environment: RoomSocketEnvironment = {
    createClient: (url) => new FakeStompClient(url),
    setTimer: (callback, delayMs) => {
      const timer = { callback, delayMs, cleared: false };
      timers.push(timer);
      return timer;
    },
    clearTimer: (handle) => {
      (handle as { cleared: boolean }).cleared = true;
    },
    random: () => 1,
    randomId: () => "corr-1",
  };
  const handlers = {
    onSnapshot: vi.fn(),
    onEvent: vi.fn(),
    onChat: vi.fn(),
    onError: vi.fn(),
    onConnectionChange: vi.fn(),
    onGameStalled: vi.fn(),
    onStartStatus: vi.fn(),
  };
  const latest = () => FakeStompClient.instances[FakeStompClient.instances.length - 1];
  const connection = openRoomConnection(
    ROOM_ID,
    null,
    { isPlayer: true, teamId: null },
    handlers,
    environment,
  );
  return { handlers, timers, latest, connection, environment };
}

const chatEnvelope = (messageId: string): ChatMessageEnvelope => ({
  type: "CHAT_MESSAGE",
  version: null,
  payload: {
    messageId,
    channel: "ROOM",
    teamId: null,
    authorId: "u-2",
    authorUsername: "bob",
    text: "hi",
    serverTimestamp: "2026-09-27T00:00:00Z",
  },
});

describe("reconcileVersion", () => {
  it("applies the immediate next version", () => {
    expect(reconcileVersion(5, 6)).toBe("apply");
  });

  it("discards a version already seen or superseded", () => {
    expect(reconcileVersion(5, 5)).toBe("discard");
    expect(reconcileVersion(5, 3)).toBe("discard");
  });

  it("resyncs on a gap", () => {
    expect(reconcileVersion(5, 7)).toBe("resync");
  });
});

describe("brokerUrl", () => {
  it("carries the affinity hint as a query parameter", () => {
    expect(brokerUrl("pod-7")).toMatch(/\?instance=pod-7$/);
  });

  it("omits the query parameter with no hint", () => {
    expect(brokerUrl(null)).not.toContain("?");
  });
});

describe("openRoomConnection", () => {
  it("assigns localVersion from the snapshot unconditionally, never max()", () => {
    const { handlers, latest } = harness();
    latest().open();
    latest().emit("/user/queue/room-state", {
      type: "ROOM_STATE",
      version: 4,
      payload: snapshot(),
    });
    expect(handlers.onSnapshot).toHaveBeenCalledWith(snapshot(), 4);

    // A later snapshot with a lower version still overwrites — assignment, not a running max.
    latest().emit("/user/queue/room-state", {
      type: "ROOM_STATE",
      version: 2,
      payload: snapshot(),
    });
    latest().emit("/topic/room.room-1", {
      type: "READINESS_CHANGED",
      version: 3,
      payload: { playerId: "u-1", ready: true },
    });
    expect(handlers.onEvent).toHaveBeenCalledOnce();
  });

  it("discards a delta at or below the current version", () => {
    const { handlers, latest } = harness();
    latest().open();
    latest().emit("/user/queue/room-state", {
      type: "ROOM_STATE",
      version: 4,
      payload: snapshot(),
    });
    latest().emit("/topic/room.room-1", {
      type: "READINESS_CHANGED",
      version: 4,
      payload: { playerId: "u-1", ready: true },
    });
    expect(handlers.onEvent).not.toHaveBeenCalled();
  });

  it("requests a fresh snapshot on a version gap, and discards until the next snapshot arrives", () => {
    const { handlers, latest } = harness();
    latest().open();
    latest().emit("/user/queue/room-state", {
      type: "ROOM_STATE",
      version: 4,
      payload: snapshot(),
    });
    latest().published.length = 0;

    latest().emit("/topic/room.room-1", {
      type: "READINESS_CHANGED",
      version: 9,
      payload: { playerId: "u-1", ready: true },
    });
    expect(handlers.onEvent).not.toHaveBeenCalled();
    expect(latest().published.some((p) => p.body.includes("REQUEST_ROOM_STATE"))).toBe(true);

    latest().emit("/topic/room.room-1", {
      type: "READINESS_CHANGED",
      version: 5,
      payload: { playerId: "u-1", ready: true },
    });
    expect(handlers.onEvent).not.toHaveBeenCalled();

    // The next snapshot ends the resync and lets normal reconciliation resume.
    latest().emit("/user/queue/room-state", {
      type: "ROOM_STATE",
      version: 9,
      payload: snapshot(),
    });
    latest().emit("/topic/room.room-1", {
      type: "READINESS_CHANGED",
      version: 10,
      payload: { playerId: "u-1", ready: true },
    });
    expect(handlers.onEvent).toHaveBeenCalledOnce();
  });

  it("never runs chat frames through version reconciliation", () => {
    const { handlers, latest } = harness();
    latest().open();
    latest().emit("/user/queue/room-state", {
      type: "ROOM_STATE",
      version: 4,
      payload: snapshot(),
    });
    latest().emit("/topic/room.room-1.chat", chatEnvelope("m-1"));
    expect(handlers.onChat).toHaveBeenCalledWith(chatEnvelope("m-1"));
    expect(handlers.onEvent).not.toHaveBeenCalled();

    // Confirm a real delta still applies afterwards — the chat frame left localVersion untouched.
    latest().emit("/topic/room.room-1", {
      type: "READINESS_CHANGED",
      version: 5,
      payload: { playerId: "u-1", ready: true },
    });
    expect(handlers.onEvent).toHaveBeenCalledOnce();
  });

  it("subscribes to the room's chat topic only for a player, not a spectator", () => {
    FakeStompClient.reset();
    const environment: RoomSocketEnvironment = {
      createClient: (url) => new FakeStompClient(url),
      setTimer: (callback, delayMs) => ({ callback, delayMs }),
      clearTimer: () => undefined,
      random: () => 1,
      randomId: () => "corr-1",
    };
    const handlers = { onSnapshot: vi.fn(), onEvent: vi.fn(), onChat: vi.fn(), onError: vi.fn() };
    openRoomConnection(ROOM_ID, null, { isPlayer: false, teamId: null }, handlers, environment);
    const client = FakeStompClient.instances[0];
    client.open();
    expect(client.isSubscribed(`/topic/room.${ROOM_ID}.chat`)).toBe(false);
  });

  it("subscribes to the team topic once membership reports a team", () => {
    const { latest, connection } = harness();
    latest().open();
    expect(latest().isSubscribed(`/topic/room.${ROOM_ID}.chat`)).toBe(true);
    expect(latest().isSubscribed(`/topic/room.${ROOM_ID}.team.t-1`)).toBe(false);

    connection.setMembership({ isPlayer: true, teamId: "t-1" });
    expect(latest().isSubscribed(`/topic/room.${ROOM_ID}.team.t-1`)).toBe(true);
  });

  it("does not resubscribe when a snapshot or event reports the membership it already has", () => {
    const { latest, connection } = harness();
    latest().open();
    connection.setMembership({ isPlayer: true, teamId: "t-1" });
    const before = latest().subscribeCount;
    for (let i = 0; i < 10; i += 1) connection.setMembership({ isPlayer: true, teamId: "t-1" });
    // The server's `subscribe` bucket holds 20 — a resubscribe per event starves the game attach.
    expect(latest().subscribeCount).toBe(before);
    connection.setMembership({ isPlayer: true, teamId: "t-2" });
    expect(latest().subscribeCount).toBeGreaterThan(before);
  });

  it("routes /user/queue/errors to onError", () => {
    const { handlers, latest } = harness();
    latest().open();
    latest().emit("/user/queue/errors", {
      type: "ERROR",
      payload: { code: "ROOM_UNAVAILABLE_RETRY", message: "busy" },
    });
    expect(handlers.onError).toHaveBeenCalledWith({
      code: "ROOM_UNAVAILABLE_RETRY",
      message: "busy",
    });
  });

  it("routes GAME_START_STATUS on the room's start topic to onStartStatus, for a spectator too", () => {
    const { handlers, latest } = harness();
    latest().open();
    expect(latest().isSubscribed(`/topic/room.${ROOM_ID}.start`)).toBe(true);
    latest().emit(`/topic/room.${ROOM_ID}.start`, {
      type: "GAME_START_STATUS",
      payload: { phase: "FAILED", reason: "NO_HOST_AVAILABLE" },
    });
    expect(handlers.onStartStatus).toHaveBeenCalledWith({
      phase: "FAILED",
      reason: "NO_HOST_AVAILABLE",
    });
  });

  it("ignores a start-topic frame that is not a GAME_START_STATUS", () => {
    const { handlers, latest } = harness();
    latest().open();
    latest().emit(`/topic/room.${ROOM_ID}.start`, { type: "SOMETHING_ELSE", payload: {} });
    expect(handlers.onStartStatus).not.toHaveBeenCalled();
  });

  it("reconnects with jittered backoff, and does not assume old subscriptions survived", () => {
    const { handlers, timers, latest } = harness();
    const first = latest();
    first.open();
    first.close();
    expect(handlers.onConnectionChange).toHaveBeenCalledWith(false);
    const live = timers.filter((t) => !t.cleared); // the attach watchdog died with the socket
    expect(live).toHaveLength(1);

    live[0].callback();
    const second = latest();
    expect(second).not.toBe(first);
    second.open();
    // A fresh client re-subscribes on its own onConnect — it does not inherit `first`'s topics.
    expect(second.isSubscribed(`/topic/room.${ROOM_ID}`)).toBe(true);
  });

  it("resets the reconnect attempt counter after a successful connection", () => {
    const { timers, latest } = harness();
    latest().close(); // never connected — closes before open()
    expect(timers).toHaveLength(1);
    const firstDelay = timers[0]?.delayMs;

    timers[0]?.callback();
    latest().open();
    latest().close();
    expect(timers[timers.length - 1]?.delayMs).toBe(firstDelay);
  });

  it("stops reconnecting and clears a pending timer once closed by the caller", () => {
    const { timers, latest, connection } = harness();
    const first = latest();
    first.close();
    connection.close();
    expect(timers[0]?.cleared).toBe(true);

    const before = FakeStompClient.instances.length;
    first.close(); // a stray late event from the now-deactivated client
    expect(FakeStompClient.instances).toHaveLength(before);
  });
});

describe("backoffDelay", () => {
  it("doubles per attempt within full jitter, capped at 30 s", () => {
    expect(backoffDelay(0, 1)).toBe(1_000);
    expect(backoffDelay(0, 0)).toBe(500);
    expect(backoffDelay(3, 1)).toBe(8_000);
    expect(backoffDelay(20, 1)).toBe(30_000);
  });
});

describe("game stream", () => {
  const raw = (client: FakeStompClient, destination: string, body: unknown) => {
    client.emit(destination, body);
  };

  it("subscribes the game destinations, then requests sync, and repeats after a reconnect", () => {
    const { connection, latest, timers } = harness();
    const listener = vi.fn();
    connection.attachGame("s-1", "t-1", listener);
    latest().open();
    const first = latest();
    expect(first.isSubscribed("/topic/game.s-1")).toBe(true);
    expect(first.isSubscribed("/topic/game.s-1.team.t-1")).toBe(true);
    expect(first.isSubscribed("/user/queue/game")).toBe(true);
    expect(first.published.some((p) => p.destination === "/app/game.s-1.sync")).toBe(true);
    raw(first, "/topic/game.s-1", { type: "GAME_EVENT" });
    expect(listener).toHaveBeenCalledWith({ type: "GAME_EVENT" });

    first.close();
    timers[timers.length - 1].callback();
    latest().open();
    expect(latest()).not.toBe(first);
    expect(latest().published.some((p) => p.destination === "/app/game.s-1.sync")).toBe(true);
  });

  it("submits an action without player identity and stops after detach", () => {
    const { connection, latest } = harness();
    const detach = connection.attachGame("s-1", null, vi.fn());
    latest().open();
    connection.submitGameAction({ move: 1 });
    const sent = latest().published.find((p) => p.destination === "/app/game.s-1.action");
    expect(JSON.parse(sent?.body ?? "{}")).toEqual({
      type: "SUBMIT_ACTION",
      correlationId: "corr-1",
      payload: { move: 1 },
    });
    detach();
    connection.submitGameAction({ move: 2 });
    expect(latest().published.filter((p) => p.destination.endsWith(".action"))).toHaveLength(1);
    expect(latest().isSubscribed("/topic/game.s-1")).toBe(false);
  });

  it("drops an unparseable game body instead of throwing", () => {
    const { connection, latest } = harness();
    const listener = vi.fn();
    connection.attachGame("s-1", null, listener);
    latest().open();
    latest().emit("/topic/game.s-1", undefined);
    expect(listener).toHaveBeenCalled();
  });
});

describe("a rate-limited attach", () => {
  const limited = (retryAfterMs?: number) => ({
    type: "ERROR",
    payload: { code: "RATE_LIMIT_EXCEEDED", message: "slow down", retryAfterMs },
  });
  const syncs = (client: FakeStompClient) =>
    client.published.filter((p) => p.destination === "/app/game.s-1.sync").length;
  interface Timer {
    callback: () => void;
    delayMs: number;
    cleared: boolean;
  }
  const pending = (timers: Timer[]) => timers.filter((t) => !t.cleared);

  it("re-runs the subscribe and sync after a back-off, and recovers when the stream delivers", () => {
    const { connection, latest, timers, handlers } = harness();
    const listener = vi.fn();
    connection.attachGame("s-1", null, listener);
    latest().open();
    const client = latest();
    expect(syncs(client)).toBe(1);
    const armed = timers.length; // the attach watchdog

    client.emit("/user/queue/errors", limited(6_500));
    client.emit("/user/queue/errors", limited(6_500)); // one pending retry covers the burst
    expect(timers).toHaveLength(armed + 1);
    expect(timers[armed].delayMs).toBeGreaterThanOrEqual(6_500);
    expect(handlers.onError).not.toHaveBeenCalled();

    timers[armed].callback();
    expect(syncs(client)).toBe(2);
    expect(client.isSubscribed("/topic/game.s-1")).toBe(true);

    client.emit("/user/queue/game", { type: "GAME_SYNC" });
    client.emit("/user/queue/room-state", { type: "ROOM_STATE", version: 1, payload: snapshot() });
    expect(listener).toHaveBeenCalledWith({ type: "GAME_SYNC" });
    const settled = timers.length;
    client.emit("/user/queue/errors", limited()); // a later flood is not an incomplete attach
    expect(handlers.onError).toHaveBeenCalledTimes(1);
    expect(timers).toHaveLength(settled);
  });

  it("treats an attach that never completes as dropped, even with no error frame", () => {
    const { connection, latest, timers, handlers } = harness();
    connection.attachGame("s-1", null, vi.fn());
    latest().open();
    const client = latest();

    const watchdog = pending(timers)[0];
    expect(watchdog.delayMs).toBe(ATTACH_WATCHDOG_MS);
    watchdog.callback();
    const retry = timers[timers.length - 1];
    retry.callback();
    expect(syncs(client)).toBe(2);
    expect(handlers.onError).not.toHaveBeenCalled();
  });

  it("gives up after the retry limit, reports a stall, and retryAttach starts over", () => {
    const { connection, latest, timers, handlers } = harness();
    connection.attachGame("s-1", null, vi.fn());
    latest().open();
    const client = latest();

    for (let i = 0; i < MAX_RATE_LIMIT_RETRIES; i += 1) {
      client.emit("/user/queue/errors", limited());
      timers[timers.length - 1].callback();
    }
    expect(handlers.onGameStalled).not.toHaveBeenCalledWith(true);
    client.emit("/user/queue/errors", limited());
    expect(handlers.onGameStalled).toHaveBeenCalledWith(true);
    expect(handlers.onError).toHaveBeenCalledTimes(1);

    const before = syncs(client);
    connection.retryAttach();
    expect(handlers.onGameStalled).toHaveBeenLastCalledWith(false);
    expect(syncs(client)).toBe(before + 1);
  });
});
