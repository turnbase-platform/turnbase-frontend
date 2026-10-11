import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { RoomConnection } from "./roomSocket";
import type { ChatMessageEnvelope, RoomStateSnapshot } from "./rooms-types";
import { useChat } from "./useChat";

const snapshot = (over: Partial<RoomStateSnapshot> = {}): RoomStateSnapshot => ({
  roomId: "r-1",
  state: "LOBBY",
  gameId: "g-1",
  gameName: "Tic-Tac-Toe",
  spectatingEnabled: true,
  spectatorCapacity: 8,
  hostId: "u-1",
  players: [
    {
      playerId: "u-1",
      username: "alice",
      teamId: "t-1",
      ready: false,
      connected: true,
      joinOrder: 1,
    },
  ],
  aiPlayers: [],
  spectators: [{ playerId: "u-5", username: "sam" }],
  teams: [],
  parameters: {},
  disconnectedPlayers: [],
  sessionId: null,
  gameFrontendUrl: null,
  ...over,
});

const team = {
  teamId: "t-1",
  templateName: "Team",
  configuredSize: 2,
  index: 0,
  memberIds: ["u-1"],
};

const message = (id: string, at: string): ChatMessageEnvelope["payload"] => ({
  messageId: id,
  channel: "ROOM",
  teamId: null,
  authorId: "u-2",
  authorUsername: "bob",
  text: id,
  serverTimestamp: at,
});

const setup = (
  snap: RoomStateSnapshot,
  userId: string,
  messages = [] as ReturnType<typeof message>[],
) => {
  const sendChatMessage = vi.fn();
  const connection = { sendChatMessage } as unknown as RoomConnection;
  const hook = renderHook(() => useChat(snap, userId, messages, connection));
  return { ...hook, sendChatMessage };
};

describe("useChat", () => {
  it("FR-CHAN-004: a spectator has no chat", () => {
    expect(setup(snapshot(), "u-5").result.current.available).toBe(false);
  });

  it("FR-MSG-004: sorts the log by server timestamp", () => {
    const { result } = setup(snapshot(), "u-1", [
      message("b", "2026-10-01T10:00:02Z"),
      message("a", "2026-10-01T10:00:01Z"),
    ]);
    expect(result.current.log.map((entry) => entry.messageId)).toEqual(["a", "b"]);
  });

  it("offers the team channel only when the game has teams and the player holds one", () => {
    expect(setup(snapshot(), "u-1").result.current.teamAvailable).toBe(false);
    expect(setup(snapshot({ teams: [team] }), "u-1").result.current.teamAvailable).toBe(true);
  });

  it("falls back to the room channel when no team is available", () => {
    const { result } = setup(snapshot(), "u-1");
    act(() => {
      result.current.setChannel("TEAM");
    });
    expect(result.current.channel).toBe("ROOM");
  });

  it("sends on the chosen channel, then clears the text", () => {
    const { result, sendChatMessage } = setup(snapshot({ teams: [team] }), "u-1");
    act(() => {
      result.current.setChannel("TEAM");
      result.current.setText("hello");
    });
    act(() => {
      result.current.submit({ preventDefault: vi.fn() } as never);
    });
    expect(sendChatMessage).toHaveBeenCalledWith("TEAM", "hello");
    expect(result.current.text).toBe("");
  });

  it("does not send a blank message", () => {
    const { result, sendChatMessage } = setup(snapshot(), "u-1");
    act(() => {
      result.current.setText("   ");
    });
    act(() => {
      result.current.submit({ preventDefault: vi.fn() } as never);
    });
    expect(sendChatMessage).not.toHaveBeenCalled();
  });
});
