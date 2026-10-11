import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { authWrapper, fakeAuth } from "../../test/authWrapper";
import { REGISTERED } from "../../test/fakeApi";
import { RoomSessionView } from "./RoomSessionView";
import type { RoomStateSnapshot } from "./rooms-types";
import type { RoomSession } from "./useRoomSession";

vi.mock("../game/GameFrame", () => ({ GameFrame: () => <div>frame</div> }));

const snapshot = (over: Partial<RoomStateSnapshot> = {}) =>
  ({
    roomId: "r-1",
    state: "LOBBY",
    gameName: "Tic-Tac-Toe",
    hostId: REGISTERED.userId,
    players: [
      {
        playerId: REGISTERED.userId,
        username: "alice",
        teamId: null,
        ready: false,
        connected: true,
      },
    ],
    aiPlayers: [],
    spectators: [],
    spectatorCapacity: 0,
    spectatingEnabled: false,
    teams: [],
    parameters: {},
    ...over,
  }) as unknown as RoomStateSnapshot;

const session = (over: Partial<RoomSession> = {}) =>
  ({
    snapshot: snapshot(),
    connection: { sendHostCommand: vi.fn(), sendChatMessage: vi.fn() },
    connected: true,
    ended: null,
    game: null,
    userId: REGISTERED.userId,
    chatMessages: [],
    lastError: null,
    gameStalled: false,
    minPlayers: 2,
    maxPlayers: 4,
    leave: vi.fn(),
    shareInvite: vi.fn(),
    returnToLobby: vi.fn(),
    ...over,
  }) as unknown as RoomSession;

const Wrapper = authWrapper(fakeAuth(REGISTERED));
const view = (s: RoomSession) => render(<RoomSessionView session={s} />, { wrapper: Wrapper });

describe("RoomSessionView", () => {
  it("shows the lobby for a room that has not started", () => {
    view(session());
    expect(screen.getByRole("heading", { level: 1, name: "Tic-Tac-Toe" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Start game" })).toBeTruthy();
  });

  it("shows the game while a session is on screen", () => {
    view(
      session({
        snapshot: snapshot({ state: "IN_PROGRESS" }),
        game: { sessionId: "s-1", gameFrontendUrl: "https://g.example/" },
      }),
    );
    expect(screen.getByText("frame")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Start game" })).toBeNull();
  });

  it("waits for the first snapshot", () => {
    view(session({ snapshot: null }));
    expect(screen.getByText("Loading room…")).toBeTruthy();
  });

  it("warns that the connection dropped", () => {
    view(session({ connected: false }));
    expect(screen.getByText(/Connection lost — reconnecting/)).toBeTruthy();
  });

  it.each([
    ["KICKED", "The host removed you from this room."],
    ["CLOSED", "This room has been closed."],
  ])("a %s room replaces the screen with its notice", (kind, text) => {
    view(session({ ended: { kind } as RoomSession["ended"] }));
    expect(screen.getByText(text)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Browse active rooms" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Leave room" })).toBeNull();
  });
});
