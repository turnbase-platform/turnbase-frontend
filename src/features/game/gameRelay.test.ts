import { describe, expect, it, vi } from "vitest";
import type { GameInbound } from "./gameMessages";
import { GameRelay } from "./gameRelay";

const SESSION = "s-1";

function setup() {
  const posted: GameInbound[] = [];
  const onLog = vi.fn();
  const onSessionFailed = vi.fn();
  const relay = new GameRelay(SESSION, {
    post: (message) => posted.push(message),
    onLog,
    onSessionFailed,
  });
  return { relay, posted, onLog, onSessionFailed };
}

const sync = (asOfSequence = 10) => ({
  type: "GAME_SYNC",
  sessionId: SESSION,
  asOfSequence,
  payload: { init: { sessionId: SESSION, role: "player" }, view: { board: 1 }, log: [] },
});
const event = (sequence: number, index = 0, payload: unknown = { n: sequence }) => ({
  type: "GAME_EVENT",
  sessionId: SESSION,
  sequence,
  index,
  payload,
});

describe("GameRelay", () => {
  it("posts nothing until both GAME_SYNC and ready have arrived", () => {
    const { relay, posted } = setup();
    relay.receive(sync());
    expect(posted).toEqual([]);
    relay.markReady();
    expect(posted).toEqual([
      { type: "init", sessionId: SESSION, role: "player" },
      { type: "game_event", payload: { board: 1 } },
    ]);
  });

  it("works in the other order: ready first, then sync", () => {
    const { relay, posted } = setup();
    relay.markReady();
    expect(posted).toEqual([]);
    relay.receive(sync());
    expect(posted.map((m) => m.type)).toEqual(["init", "game_event"]);
  });

  it("holds messages until init, then flushes in (sequence, index) order, dropping the snapshot's", () => {
    const { relay, posted } = setup();
    relay.receive(event(13));
    relay.receive(event(11, 1, "b"));
    relay.receive(event(11, 0, "a"));
    relay.receive(event(9, 0, "old"));
    relay.receive(sync(10));
    relay.markReady();
    expect(posted.slice(2).map((m) => (m as { payload: unknown }).payload)).toEqual([
      "a",
      "b",
      { n: 13 },
    ]);
  });

  it("dedups a redelivered message and does not gap-detect", () => {
    const { relay, posted } = setup();
    relay.receive(sync(10));
    relay.markReady();
    relay.receive(event(12));
    relay.receive(event(12));
    relay.receive(event(40));
    expect(posted.filter((m) => m.type === "game_event")).toHaveLength(3); // view, 12, 40
  });

  it("translates player, over and log messages; drops reason; never relays the log", () => {
    const { relay, posted, onLog } = setup();
    relay.receive(sync());
    relay.markReady();
    const player = { id: "p", displayName: "P", teamId: null };
    relay.receive({
      type: "GAME_PLAYER_JOINED",
      sessionId: SESSION,
      sequence: 11,
      index: -1,
      payload: { player },
    });
    relay.receive({
      type: "GAME_PLAYER_LEFT",
      sessionId: SESSION,
      sequence: 12,
      index: -1,
      payload: { player, reason: "KICKED" },
    });
    relay.receive({
      type: "GAME_LOG",
      sessionId: SESSION,
      sequence: 13,
      index: 0,
      payload: { entry: "hi" },
    });
    relay.receive({
      type: "GAME_OVER",
      sessionId: SESSION,
      sequence: 14,
      index: 0,
      payload: { results: { winner: "p" }, outcome: "secret" },
    });
    expect(posted.slice(2)).toEqual([
      { type: "player_joined", player },
      { type: "player_left", player },
      { type: "game_over", results: { winner: "p" } },
    ]);
    expect(onLog).toHaveBeenLastCalledWith([{ sequence: 13, index: 0, entry: "hi" }]);
  });

  it("surfaces SESSION_FAILED to the platform, not the iframe", () => {
    const { relay, posted, onSessionFailed } = setup();
    relay.receive({
      type: "SESSION_FAILED",
      sessionId: SESSION,
      payload: { reason: "GAME_ERROR", message: "boom" },
    });
    expect(onSessionFailed).toHaveBeenCalledWith({ reason: "GAME_ERROR", message: "boom" });
    expect(posted).toEqual([]);
  });

  it("drops foreign-session and malformed messages", () => {
    const { relay, posted } = setup();
    relay.receive(sync());
    relay.markReady();
    relay.receive({ ...event(20), sessionId: "other" });
    relay.receive(null);
    relay.receive("x");
    relay.receive({ type: "GAME_EVENT", sessionId: SESSION });
    relay.receive({ type: "GAME_SYNC", sessionId: SESSION, payload: null });
    expect(posted).toHaveLength(2);
  });

  it("on a re-sync posts only the view, not a second init, and re-seeds dedup", () => {
    const { relay, posted } = setup();
    relay.receive(sync(10));
    relay.markReady();
    relay.receive(event(11));
    relay.receive(sync(20));
    relay.receive(event(15));
    relay.receive(event(21));
    expect(posted.filter((m) => m.type === "init")).toHaveLength(1);
    expect(posted.map((m) => (m as { payload?: unknown }).payload)).toEqual([
      undefined,
      { board: 1 },
      { n: 11 },
      { board: 1 },
      { n: 21 },
    ]);
  });
});
