import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RoomConnection } from "../rooms/roomSocket";
import { GAME_SANDBOX, GameFrame, READY_TIMEOUT_MS } from "./GameFrame";

const URL_ = "http://chess.games.localhost:8080/play/abc";
const ORIGIN = "http://chess.games.localhost:8080";

function setup(url = URL_) {
  let listener: (raw: unknown) => void = () => undefined;
  const detach = vi.fn();
  const connection = {
    attachGame: vi.fn((_s: string, _t: string | null, l: (raw: unknown) => void) => {
      listener = l;
      return detach;
    }),
    submitGameAction: vi.fn(),
  } as unknown as RoomConnection;
  const view = render(
    <GameFrame gameFrontendUrl={url} sessionId="s-1" teamId="t-1" connection={connection} />,
  );
  const frame = screen.queryByTitle<HTMLIFrameElement>("Game");
  const post = vi.fn();
  if (frame) {
    Object.defineProperty(frame, "contentWindow", { value: { postMessage: post } });
  }
  const deliver = (data: unknown, origin = ORIGIN, source: unknown = frame?.contentWindow) => {
    act(() => {
      window.dispatchEvent(new MessageEvent("message", { data, origin, source: source as Window }));
    });
  };
  return {
    connection,
    frame,
    post,
    deliver,
    view,
    detach,
    server: (raw: unknown) => {
      act(() => {
        listener(raw);
      });
    },
  };
}

const sync = {
  type: "GAME_SYNC",
  sessionId: "s-1",
  asOfSequence: 0,
  payload: { init: { sessionId: "s-1" }, view: {}, log: [] },
};

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("GameFrame", () => {
  it("carries the normative sandbox, an empty allow list and no referrer", () => {
    const { frame } = setup();
    expect(frame?.getAttribute("sandbox")).toBe("allow-scripts allow-same-origin");
    expect(GAME_SANDBOX).toBe("allow-scripts allow-same-origin");
    expect(frame?.getAttribute("allow")).toBe("");
    expect(frame?.getAttribute("referrerpolicy")).toBe("no-referrer");
    expect(frame?.getAttribute("src")).toBe(URL_);
  });

  it("renders no frame for an unusable URL", () => {
    const { frame, connection } = setup("/relative");
    expect(frame).toBeNull();
    expect(connection.attachGame).not.toHaveBeenCalled();
  });

  it("submits an action from the exact origin and frame, adding no identity", () => {
    const { deliver, connection } = setup();
    deliver({ type: "action", payload: { move: 1 } });
    expect(connection.submitGameAction).toHaveBeenCalledWith({ move: 1 });
  });

  it.each([
    ["a prefix-lookalike origin", "http://chess.games.localhost:8080.evil.io"],
    ["the string null", "null"],
    ["the platform origin", "http://localhost:8080"],
  ])("drops messages from %s", (_name, origin) => {
    const { deliver, connection } = setup();
    deliver({ type: "action", payload: 1 }, origin);
    expect(connection.submitGameAction).not.toHaveBeenCalled();
  });

  it("drops messages from the right origin but a different window", () => {
    const { deliver, connection } = setup();
    deliver({ type: "action", payload: 1 }, ORIGIN, {});
    expect(connection.submitGameAction).not.toHaveBeenCalled();
  });

  it("drops malformed payloads", () => {
    const { deliver, connection } = setup();
    deliver("action");
    deliver({ type: "action" });
    deliver({ type: "other" });
    expect(connection.submitGameAction).not.toHaveBeenCalled();
  });

  it("posts init to the exact game origin after sync + ready, never '*'", () => {
    const { deliver, server, post } = setup();
    server(sync);
    expect(post).not.toHaveBeenCalled();
    deliver({ type: "ready" });
    expect(post).toHaveBeenCalledTimes(2);
    post.mock.calls.forEach((call) => {
      expect(call[1]).toBe(ORIGIN);
    });
    expect((post.mock.calls[0]?.[0] as { type: string }).type).toBe("init");
  });

  it("shows a timeout when ready never arrives, and clears it when it does", () => {
    const { deliver } = setup();
    act(() => {
      vi.advanceTimersByTime(READY_TIMEOUT_MS);
    });
    expect(screen.getByText("The game is taking too long to start.")).toBeTruthy();
    deliver({ type: "ready" });
    expect(screen.queryByText("The game is taking too long to start.")).toBeNull();
  });

  it("shows SESSION_FAILED in the platform UI", () => {
    const { server } = setup();
    server({
      type: "SESSION_FAILED",
      sessionId: "s-1",
      payload: { reason: "GAME_ERROR", message: "The game encountered an error." },
    });
    expect(screen.getByText("The game encountered an error.")).toBeTruthy();
  });

  it("stops listening and detaches on unmount", () => {
    const { view, deliver, connection, detach } = setup();
    view.unmount();
    expect(detach).toHaveBeenCalled();
    deliver({ type: "action", payload: 1 });
    expect(connection.submitGameAction).not.toHaveBeenCalled();
  });
});
