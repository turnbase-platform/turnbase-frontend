import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FakeEventSource, REGISTERED, installFakeApi } from "../../test/fakeApi";
import { renderAt, where } from "../../test/renderApp";
import type { RoomConnection } from "./roomSocket";
import type { RoomStateSnapshot } from "./rooms-types";
import type { RoomConnectionState } from "./useRoomConnection";

const mocked = vi.hoisted(() => ({
  state: null as RoomConnectionState | null,
  calls: [] as [string, string | null][],
}));
vi.mock("./useRoomConnection", () => ({
  useRoomConnection: (roomId: string, hint: string | null) => {
    mocked.calls.push([roomId, hint]);
    return mocked.state;
  },
}));

const session = { "GET /api/auth/session": { body: REGISTERED } };

const resource = (extra: object = {}) => ({
  roomId: "r-1",
  gameId: "g-1",
  gameName: "Tic-Tac-Toe",
  gameVersion: "1.0.0",
  state: "LOBBY",
  visibility: "INVITE_ONLY",
  hostUserId: "u-9",
  hostUsername: "bob",
  spectatingEnabled: true,
  spectatorCapacity: 8,
  spectatorCount: 0,
  playerCount: 2,
  playerCapacity: 2,
  minPlayers: 2,
  maxPlayers: 2,
  canJoin: false,
  canSpectate: false,
  version: 1,
  createdAt: "2026-10-01T10:00:00Z",
  ...extra,
});

const snapshot = (extra: Partial<RoomStateSnapshot> = {}): RoomStateSnapshot => ({
  roomId: "r-1",
  state: "LOBBY",
  gameId: "g-1",
  gameName: "Tic-Tac-Toe",
  spectatingEnabled: true,
  spectatorCapacity: 8,
  hostId: "u-9",
  players: [
    {
      playerId: "u-9",
      username: "bob",
      teamId: "t-1",
      ready: false,
      connected: true,
      joinOrder: 1,
    },
    {
      playerId: "u-1",
      username: "alice",
      teamId: "t-2",
      ready: true,
      connected: true,
      joinOrder: 2,
    },
  ],
  aiPlayers: [],
  spectators: [],
  teams: [],
  parameters: { boardSize: 3 },
  disconnectedPlayers: [],
  sessionId: null,
  gameFrontendUrl: null,
  ...extra,
});

function connection() {
  return {
    sendMemberCommand: vi.fn(),
    sendHostCommand: vi.fn(),
  } as unknown as RoomConnection & {
    sendMemberCommand: ReturnType<typeof vi.fn>;
    sendHostCommand: ReturnType<typeof vi.fn>;
  };
}

function setConnection(extra: Partial<RoomConnectionState> = {}) {
  const conn = connection();
  mocked.state = {
    snapshot: snapshot(),
    connected: true,
    chatMessages: [],
    lastError: null,
    ended: null,
    connection: conn,
    ...extra,
  } satisfies RoomConnectionState;
  return conn;
}

const hint = { "X-TurnBase-Room-Instance": "pod-a" };

beforeEach(() => {
  mocked.calls = [];
  FakeEventSource.reset();
  vi.stubGlobal("EventSource", FakeEventSource);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("RoomPage entry", () => {
  it("re-joins on entry so a refresh restores membership, and opens the socket at the hint", async () => {
    setConnection();
    const api = installFakeApi({
      ...session,
      "GET /api/rooms/r-1": { body: resource({ canJoin: true }), headers: hint },
      "POST /api/rooms/r-1/participants": {
        body: { room: resource(), releasedRoom: null },
        headers: { "X-TurnBase-Room-Instance": "pod-b" },
      },
    });
    renderAt("/rooms/r-1");

    expect(await screen.findByRole("heading", { name: "Tic-Tac-Toe" })).toBeInTheDocument();
    expect(api.calls.find((c) => c.method === "POST")?.body).toEqual({ role: "PLAYER" });
    expect(mocked.calls.at(-1)).toEqual(["r-1", "pod-b"]);
  });

  it("does not join a room the caller cannot join or spectate, and still connects", async () => {
    setConnection();
    const api = installFakeApi({
      ...session,
      "GET /api/rooms/r-1": { body: resource(), headers: hint },
    });
    renderAt("/rooms/r-1");

    await screen.findByRole("heading", { name: "Tic-Tac-Toe" });
    expect(api.calls.some((c) => c.method === "POST")).toBe(false);
    expect(mocked.calls.at(-1)).toEqual(["r-1", "pod-a"]);
  });

  it("says so for a room that no longer exists (FR-REJOIN-008)", async () => {
    setConnection();
    installFakeApi({ ...session });
    renderAt("/rooms/r-1");
    expect(await screen.findByText(/closed, or you cannot enter/)).toBeInTheDocument();
  });
});

describe("Lobby as a non-host player (VW-RLOBBY-001…004)", () => {
  async function open(extra: Partial<RoomConnectionState> = {}, heading = true) {
    const conn = setConnection(extra);
    installFakeApi({
      ...session,
      "GET /api/rooms/r-1": { body: resource(), headers: hint },
      "DELETE /api/rooms/r-1/participants/me": { status: 204 },
      "GET /api/rooms?sort=createdAt%2Cdesc&page=1&size=25": {
        body: {
          content: [],
          pagination: { page: 1, size: 25, totalElements: 0, totalPages: 0 },
          reservedSlot: null,
        },
      },
    });
    renderAt("/rooms/r-1");
    if (heading) await screen.findByRole("heading", { name: "Tic-Tac-Toe" });
    return conn;
  }

  it("lists players with readiness and shows the parameters read-only", async () => {
    await open();
    expect(screen.getByText("bob")).toBeInTheDocument();
    expect(screen.getByText("Host")).toBeInTheDocument();
    expect(screen.getByText("Ready")).toBeInTheDocument();
    expect(screen.getByText("boardSize")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("toggles readiness and offers no host controls", async () => {
    const conn = await open();
    await userEvent.click(screen.getByRole("button", { name: "Not ready" }));
    expect(conn.sendMemberCommand).toHaveBeenCalledWith("TOGGLE_READY", { ready: false });
    expect(screen.queryByRole("button", { name: "Start game" })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Kick/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Transfer host/ })).toBeNull();
  });

  it("leaves the room and returns to the list", async () => {
    await open();
    await userEvent.click(screen.getByRole("button", { name: "Leave room" }));
    await waitFor(() => {
      expect(where()).toBe("/rooms");
    });
  });

  it("shows the reconnection banner while the socket is down", async () => {
    await open({ connected: false });
    expect(screen.getByText(/Connection lost — reconnecting/)).toBeInTheDocument();
  });

  it("explains removal by the host and by closure", async () => {
    await open({ ended: { kind: "KICKED" } }, false);
    expect(await screen.findByText("The host removed you from this room.")).toBeInTheDocument();
    cleanup();
    await open({ ended: { kind: "CLOSED", reason: "IDLE_TIMEOUT" } }, false);
    expect(await screen.findByText("This room has been closed.")).toBeInTheDocument();
  });
});

describe("Lobby as the host (VW-RLOBBY-006, 009, 011, 014)", () => {
  async function openAsHost(extra: Partial<RoomConnectionState> = {}) {
    const conn = setConnection({
      snapshot: snapshot({ hostId: "u-1" }),
      ...extra,
    });
    installFakeApi({
      ...session,
      "GET /api/rooms/r-1": { body: resource({ inviteCode: "K7" }), headers: hint },
    });
    renderAt("/rooms/r-1");
    await screen.findByRole("heading", { name: "Tic-Tac-Toe" });
    return conn;
  }

  it("starts the game without recomputing readiness, and has no readiness toggle", async () => {
    const conn = await openAsHost();
    await userEvent.click(screen.getByRole("button", { name: "Start game" }));
    expect(conn.sendHostCommand).toHaveBeenCalledWith("START_GAME");
    expect(screen.queryByRole("button", { name: /^(Not ready|Ready)$/ })).toBeNull();
  });

  it("surfaces the server's rejection of a start", async () => {
    await openAsHost({
      lastError: { code: "START_CONDITIONS_NOT_MET", message: "x", details: {} },
    });
    expect(screen.getByText(/not every start condition is met/)).toBeInTheDocument();
  });

  it("kicks and transfers host to another player only", async () => {
    const conn = await openAsHost();
    expect(screen.queryByRole("button", { name: "Kick alice" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Kick bob" }));
    expect(conn.sendHostCommand).toHaveBeenCalledWith("KICK_PLAYER", { playerId: "u-9" });
    await userEvent.click(screen.getByRole("button", { name: "Transfer host to bob" }));
    expect(conn.sendHostCommand).toHaveBeenCalledWith("TRANSFER_HOST", { newHostId: "u-9" });
  });

  it("copies the invite link", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    await openAsHost();
    await userEvent.click(screen.getByRole("button", { name: "Share invite link" }));
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/rooms/join/K7`);
  });
});
