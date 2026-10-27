import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FakeEventSource, GUEST, REGISTERED, installFakeApi } from "../../test/fakeApi";
import { renderAt, where } from "../../test/renderApp";
import type { RoomConnection } from "./roomSocket";
import type { RoomStateSnapshot } from "./rooms-types";
import type { RoomConnectionState } from "./useRoomConnection";

const mocked = vi.hoisted(() => ({
  state: null as RoomConnectionState | null,
  calls: [] as [string, string | null][],
  rerender: null as (() => void) | null,
}));
vi.mock("./useRoomConnection", async () => {
  const { useReducer, useEffect } = await import("react");
  return {
    useRoomConnection: (roomId: string, hint: string | null) => {
      const [, tick] = useReducer((n: number) => n + 1, 0);
      useEffect(() => {
        mocked.rerender = tick;
      }, []);
      mocked.calls.push([roomId, hint]);
      return mocked.state;
    },
  };
});

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
  viewerRole: null,
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
    submitGameAction: vi.fn(),
    attachGame: vi.fn(() => vi.fn()),
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
    gameStalled: false,
    startStatus: null,
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

describe("RoomPage entry (IMP-GATE-95)", () => {
  it("re-enters a member with the idempotent join, and opens the socket at the new hint", async () => {
    setConnection();
    const api = installFakeApi({
      ...session,
      "GET /api/rooms/r-1": { body: resource({ viewerRole: "PLAYER" }), headers: hint },
      "POST /api/rooms/r-1/participants": {
        body: { room: resource({ viewerRole: "PLAYER" }), releasedRoom: null },
        headers: { "X-TurnBase-Room-Instance": "pod-b" },
      },
    });
    renderAt("/rooms/r-1");

    expect(await screen.findByRole("heading", { name: "Tic-Tac-Toe" })).toBeInTheDocument();
    expect(api.calls.find((c) => c.method === "POST")?.body).toEqual({ role: "PLAYER" });
    expect(mocked.calls.at(-1)).toEqual(["r-1", "pod-b"]);
  });

  it("re-enters a spectator as a spectator", async () => {
    setConnection();
    const api = installFakeApi({
      ...session,
      "GET /api/rooms/r-1": { body: resource({ viewerRole: "SPECTATOR" }), headers: hint },
      "POST /api/rooms/r-1/participants": {
        body: { room: resource({ viewerRole: "SPECTATOR" }), releasedRoom: null },
      },
    });
    renderAt("/rooms/r-1");
    await screen.findByRole("heading", { name: "Tic-Tac-Toe" });
    expect(api.calls.find((c) => c.method === "POST")?.body).toEqual({ role: "SPECTATOR" });
  });

  it("asks a non-member and enrols only when a button is pressed", async () => {
    setConnection();
    const api = installFakeApi({
      ...session,
      "GET /api/rooms/r-1": { body: resource({ canJoin: true, canSpectate: true }), headers: hint },
      "POST /api/rooms/r-1/participants": {
        body: { room: resource({ viewerRole: "SPECTATOR" }), releasedRoom: null },
      },
    });
    renderAt("/rooms/r-1");

    await screen.findByRole("button", { name: "Join as player" });
    expect(api.calls.some((c) => c.method === "POST")).toBe(false);
    expect(mocked.calls).toEqual([]); // no socket until a role is held

    await userEvent.click(screen.getByRole("button", { name: "Join as spectator" }));
    expect(await screen.findByRole("heading", { name: "Tic-Tac-Toe" })).toBeInTheDocument();
    expect(api.calls.find((c) => c.method === "POST")?.body).toEqual({ role: "SPECTATOR" });
  });

  it("offers only the role that is available", async () => {
    setConnection();
    installFakeApi({
      ...session,
      "GET /api/rooms/r-1": { body: resource({ canSpectate: true }), headers: hint },
    });
    renderAt("/rooms/r-1");
    await screen.findByRole("button", { name: "Join as spectator" });
    expect(screen.queryByRole("button", { name: "Join as player" })).toBeNull();
  });

  it("shows the error, and never joins, when a non-member has no role (VW-JOIN-003)", async () => {
    setConnection();
    const api = installFakeApi({
      ...session,
      "GET /api/rooms/r-1": { body: resource(), headers: hint },
    });
    renderAt("/rooms/r-1");
    expect(await screen.findByText(/no role available to you/)).toBeInTheDocument();
    expect(api.calls.some((c) => c.method === "POST")).toBe(false);
  });

  it("says so for a room that no longer exists (FR-REJOIN-008)", async () => {
    setConnection();
    installFakeApi({ ...session });
    renderAt("/rooms/r-1");
    expect(await screen.findByText(/closed, or has no role/)).toBeInTheDocument();
  });
});

describe("Lobby as a non-host player (VW-RLOBBY-001…004)", () => {
  async function open(extra: Partial<RoomConnectionState> = {}, heading = true) {
    const conn = setConnection(extra);
    installFakeApi({
      ...session,
      "GET /api/rooms/r-1": { body: resource({ viewerRole: "PLAYER" }), headers: hint },
      "POST /api/rooms/r-1/participants": {
        body: { room: resource({ viewerRole: "PLAYER" }), releasedRoom: null },
      },
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
    const players = within(screen.getByRole("list", { name: "Players" }));
    expect(players.getByText("Host")).toBeInTheDocument();
    expect(players.getByText("Ready")).toBeInTheDocument();
    expect(players.getByText("bob")).toBeInTheDocument();
    const settings = within(screen.getByLabelText("Room settings"));
    expect(settings.getByText("boardSize")).toBeInTheDocument();
    expect(settings.getByText("3")).toBeInTheDocument();
    expect(settings.queryByRole("textbox")).toBeNull();
    expect(settings.queryByRole("switch")).toBeNull();
  });

  it("toggles readiness and offers no host controls", async () => {
    const conn = await open();
    await userEvent.click(screen.getByRole("switch", { name: "I am ready" }));
    expect(conn.sendMemberCommand).toHaveBeenCalledWith("TOGGLE_READY", { ready: false });
    expect(screen.queryByRole("button", { name: "Start game" })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Kick/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Transfer host/ })).toBeNull();
  });

  it("shows every participant what the host's Start is doing, and why it failed", async () => {
    await open({ startStatus: { phase: "WAITING_FOR_HOST" } });
    expect(screen.getByText(/Waiting for a game server to come online/)).toBeInTheDocument();
    cleanup();
    await open({ startStatus: { phase: "FAILED", reason: "NO_HOST_AVAILABLE" } });
    expect(screen.getByText(/No game server is available right now/)).toBeInTheDocument();
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
      snapshot: snapshot({
        hostId: "u-1",
        players: snapshot().players.map((p) => ({ ...p, ready: true })),
      }),
      ...extra,
    });
    installFakeApi({
      ...session,
      "GET /api/rooms/r-1": {
        body: resource({ inviteCode: "K7", viewerRole: "PLAYER" }),
        headers: hint,
      },
      "POST /api/rooms/r-1/participants": {
        body: { room: resource({ inviteCode: "K7", viewerRole: "PLAYER" }), releasedRoom: null },
      },
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

  it("disables Start, and says why, until every other player is ready", async () => {
    const conn = await openAsHost({
      snapshot: snapshot({ hostId: "u-1" }), // bob is not ready
    });
    expect(screen.getByRole("button", { name: "Start game" })).toBeDisabled();
    expect(screen.getByText("bob is not ready.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Start game" }));
    expect(conn.sendHostCommand).not.toHaveBeenCalled();
  });

  it("disables Start while the game lacks players", async () => {
    setConnection({
      snapshot: snapshot({ hostId: "u-1", players: snapshot().players.slice(1) }),
    });
    installFakeApi({
      ...session,
      "GET /api/rooms/r-1": { body: resource({ viewerRole: "PLAYER" }), headers: hint },
      "POST /api/rooms/r-1/participants": {
        body: { room: resource({ viewerRole: "PLAYER" }), releasedRoom: null },
      },
    });
    renderAt("/rooms/r-1");
    await screen.findByRole("heading", { name: "Tic-Tac-Toe" });
    expect(screen.getByRole("button", { name: "Start game" })).toBeDisabled();
    expect(screen.getByText(/needs at least 2 players; 1 joined/)).toBeInTheDocument();
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
    await userEvent.click(screen.getByRole("button", { name: "Copy link" }));
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/rooms/join/K7`);
  });
});

describe("Invite friends (VW-RLOBBY-005)", () => {
  const friends = {
    "GET /api/users/alice/friends": {
      body: {
        content: [
          { userId: "u-3", username: "carol" },
          { userId: "u-4", username: "dave" },
        ],
      },
    },
  };

  async function open(
    asHost: boolean,
    routes: Parameters<typeof installFakeApi>[0] = {},
    principal: object = REGISTERED,
  ) {
    setConnection({
      snapshot: snapshot({ hostId: asHost ? "u-1" : "u-9" }),
    });
    const api = installFakeApi({
      "GET /api/auth/session": { body: principal },
      "GET /api/rooms/r-1": { body: resource({ viewerRole: "PLAYER" }), headers: hint },
      "POST /api/rooms/r-1/participants": {
        body: { room: resource({ viewerRole: "PLAYER" }), releasedRoom: null },
      },
      ...friends,
      ...routes,
    });
    renderAt("/rooms/r-1");
    await screen.findByRole("heading", { name: "Tic-Tac-Toe" });
    return api;
  }

  it("is hidden from a non-host and from a Guest host", async () => {
    await open(false);
    expect(screen.queryByRole("button", { name: "Invite friends" })).toBeNull();
    cleanup();
    await open(true, {}, GUEST);
    expect(screen.queryByRole("button", { name: "Invite friends" })).toBeNull();
  });

  it("sends one invitation per selected friend", async () => {
    const api = await open(true, {
      "POST /api/rooms/r-1/invitations": { status: 201, body: { invitationId: "i-1" } },
    });
    await userEvent.click(screen.getByRole("button", { name: "Invite friends" }));
    await userEvent.click(await screen.findByRole("checkbox", { name: "carol" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "dave" }));
    await userEvent.click(screen.getByRole("button", { name: "Send invitations" }));
    await waitFor(() => {
      expect(api.calls.filter((c) => c.path === "/api/rooms/r-1/invitations")).toHaveLength(2);
    });
    const bodies = api.calls.filter((c) => c.path.endsWith("/invitations")).map((c) => c.body);
    expect(bodies).toEqual([{ inviteeUsername: "carol" }, { inviteeUsername: "dave" }]);
  });

  it("renders a documented 4xx as a message and keeps that friend selected", async () => {
    await open(true, {
      "POST /api/rooms/r-1/invitations": {
        status: 422,
        body: { status: 422, title: "Unprocessable" },
      },
    });
    await userEvent.click(screen.getByRole("button", { name: "Invite friends" }));
    await userEvent.click(await screen.findByRole("checkbox", { name: "carol" }));
    await userEvent.click(screen.getByRole("button", { name: "Send invitations" }));
    expect(await screen.findByText("carol: you can only invite friends.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Send invitations" })).toBeTruthy();
  });

  it("says so when the host has no friends", async () => {
    await open(true, { "GET /api/users/alice/friends": { body: { content: [] } } });
    await userEvent.click(screen.getByRole("button", { name: "Invite friends" }));
    expect(await screen.findByText(/You have no friends to invite yet/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Send invitations" })).toBeNull();
  });
});

/** The room panel is behind the dock while a game is shown (`immersive-room.md` §2.2). */
async function openPanel() {
  await userEvent.click(screen.getByRole("button", { name: "Room menu" }));
}

/** Leave room asks first (VW-RGAME-012): the button, then the confirmation. */
async function leaveRoom() {
  await userEvent.click(screen.getByRole("button", { name: "Leave room" }));
  await userEvent.click(screen.getByRole("button", { name: "Leave" }));
}

describe("In-game and results views (VW-RGAME-001…016, VW-RRESULT-001…005)", () => {
  const playing = (extra: Partial<RoomStateSnapshot> = {}) =>
    snapshot({
      state: "IN_PROGRESS",
      sessionId: "s-1",
      gameFrontendUrl: "http://g-1.games.localhost:8080/play/s-1",
      ...extra,
    });

  async function open(snap: RoomStateSnapshot) {
    const conn = setConnection({ snapshot: snap });
    installFakeApi({
      ...session,
      "GET /api/rooms/r-1": {
        body: resource({ state: snap.state, viewerRole: "PLAYER" }),
        headers: hint,
      },
      "POST /api/rooms/r-1/participants": {
        body: { room: resource({ state: snap.state, viewerRole: "PLAYER" }), releasedRoom: null },
      },
      "DELETE /api/rooms/r-1/participants/me": { status: 204 },
    });
    renderAt("/rooms/r-1");
    await screen.findByTitle("Game");
    return conn;
  }

  it("mounts the sandboxed iframe at the server-supplied URL and attaches the game stream", async () => {
    const conn = await open(playing());
    const frame = screen.getByTitle("Game");
    expect(frame).toHaveAttribute("src", "http://g-1.games.localhost:8080/play/s-1");
    expect(frame).toHaveAttribute("sandbox", "allow-scripts allow-same-origin");
    expect(conn.attachGame).toHaveBeenCalledWith("s-1", "t-2", expect.any(Function));
    expect(screen.queryByRole("button", { name: "Start game" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Return to lobby" })).toBeNull();
  });

  it("shows participants with connection state, and host controls to the host only", async () => {
    await open(
      playing({
        hostId: "u-1",
        players: snapshot().players.map((p) =>
          p.playerId === "u-9" ? { ...p, connected: false } : p,
        ),
      }),
    );
    await openPanel();
    const panel = screen.getByRole("list", { name: "Participants" });
    expect(within(panel).getByText("Disconnected")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Kick bob" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Transfer host to bob" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Kick alice" })).toBeNull();
  });

  it("offers no host controls to a non-host, but still Leave", async () => {
    await open(playing());
    await openPanel();
    expect(screen.queryByRole("button", { name: /^Kick/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Transfer host/ })).toBeNull();
    await leaveRoom();
    await waitFor(() => {
      expect(where()).toBe("/rooms");
    });
  });

  it("keeps the same iframe through GAME_ENDED, then Return to Lobby reveals the lobby", async () => {
    const conn = await open(playing({ hostId: "u-1" }));
    const frame = screen.getByTitle("Game");
    await openPanel();

    act(() => {
      mocked.state = {
        ...(mocked.state ?? ({} as RoomConnectionState)),
        snapshot: snapshot({ hostId: "u-1" }), // what the reducer yields for GAME_ENDED
      };
      mocked.rerender?.();
    });

    expect(screen.getByTitle("Game")).toBe(frame);
    expect(conn.attachGame).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Kick bob" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Leave room" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Return to lobby" }));
    expect(screen.queryByTitle("Game")).toBeNull();
    expect(screen.getByRole("button", { name: "Start game" })).toBeInTheDocument();
  });

  it("a stalled game attach shows an error and a Retry that re-runs it", async () => {
    const conn = setConnection({
      snapshot: snapshot({
        state: "IN_PROGRESS",
        sessionId: "s-1",
        gameFrontendUrl: "http://g-1.games.localhost:8080/play/s-1",
      }),
      gameStalled: true,
    });
    const retryAttach = vi.fn();
    Object.assign(conn, { retryAttach });
    installFakeApi({
      ...session,
      "GET /api/rooms/r-1": { body: resource({ viewerRole: "PLAYER" }), headers: hint },
      "POST /api/rooms/r-1/participants": {
        body: { room: resource({ viewerRole: "PLAYER" }), releasedRoom: null },
      },
    });
    renderAt("/rooms/r-1");
    await screen.findByText(/The game could not be loaded/);
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(retryAttach).toHaveBeenCalledTimes(1);
  });

  it("a snapshot already in the Lobby shows the lobby, not an empty frame", async () => {
    setConnection();
    installFakeApi({
      ...session,
      "GET /api/rooms/r-1": { body: resource({ viewerRole: "PLAYER" }), headers: hint },
      "POST /api/rooms/r-1/participants": {
        body: { room: resource({ viewerRole: "PLAYER" }), releasedRoom: null },
      },
    });
    renderAt("/rooms/r-1");
    await screen.findByRole("heading", { name: "Tic-Tac-Toe" });
    expect(screen.queryByTitle("Game")).toBeNull();
  });
});

describe("Spectator views (VW-RLOBBY-012, 013, 015; VW-RGAME-006)", () => {
  const spectating = (extra: Partial<RoomStateSnapshot> = {}) =>
    snapshot({
      players: snapshot().players.filter((p) => p.playerId !== "u-1"),
      spectators: [{ playerId: "u-1", username: "alice" }],
      ...extra,
    });

  async function open(snap: RoomStateSnapshot, heading: string | RegExp = "Tic-Tac-Toe") {
    setConnection({ snapshot: snap });
    installFakeApi({
      ...session,
      "GET /api/rooms/r-1": { body: resource({ viewerRole: "SPECTATOR" }), headers: hint },
      "POST /api/rooms/r-1/participants": {
        body: { room: resource({ viewerRole: "SPECTATOR" }), releasedRoom: null },
      },
    });
    renderAt("/rooms/r-1");
    if (typeof heading === "string") await screen.findByRole("heading", { name: heading });
    else await screen.findByTitle("Game");
  }

  it("sees the lobby with Switch to player where a seat is free, and no chat or readiness", async () => {
    await open(spectating());
    expect(screen.getByRole("button", { name: "Switch to player" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Chat" })).toBeNull();
    expect(screen.queryByRole("button", { name: /^(Not ready|Ready)$/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "Start game" })).toBeNull();
  });

  it("is not offered Switch to player when every seat is taken", async () => {
    await open(
      spectating({
        players: [...snapshot().players],
      }),
    );
    expect(screen.queryByRole("button", { name: "Switch to player" })).toBeNull();
  });

  it("sees the board and the participants in game, without a chat box", async () => {
    await open(
      spectating({
        state: "IN_PROGRESS",
        sessionId: "s-1",
        gameFrontendUrl: "http://g-1.games.localhost:8080/play/s-1",
      }),
      /Tic-Tac-Toe/,
    );
    expect(screen.getByTitle("Game")).toBeInTheDocument();
    await openPanel();
    expect(screen.getByRole("list", { name: "Participants" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Chat" })).toBeNull();
  });
});

describe("Reload warning (FR-DC-008)", () => {
  const playing = (extra: Partial<RoomStateSnapshot> = {}) =>
    snapshot({
      state: "IN_PROGRESS",
      sessionId: "s-1",
      gameFrontendUrl: "http://g-1.games.localhost:8080/play/s-1",
      ...extra,
    });
  const spectating = () =>
    snapshot({
      players: snapshot().players.filter((p) => p.playerId !== "u-1"),
      spectators: [{ playerId: "u-1", username: "alice" }],
    });

  /** True when something on `window` asks the browser to confirm leaving. */
  function warns() {
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    return event.defaultPrevented;
  }

  async function open(snap: RoomStateSnapshot, viewerRole: "PLAYER" | "SPECTATOR" = "PLAYER") {
    setConnection({ snapshot: snap });
    installFakeApi({
      ...session,
      "GET /api/rooms/r-1": { body: resource({ viewerRole }), headers: hint },
      "POST /api/rooms/r-1/participants": {
        body: { room: resource({ viewerRole }), releasedRoom: null },
      },
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
    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: "Tic-Tac-Toe" }) ?? screen.queryByTitle("Game"),
      ).not.toBeNull();
    });
  }

  it("is registered for a participant in Lobby", async () => {
    await open(snapshot());
    expect(warns()).toBe(true);
  });

  it("is registered on the results overlay", async () => {
    await open(playing());
    expect(warns()).toBe(false);
    await openPanel();
    act(() => {
      mocked.state = {
        ...(mocked.state ?? ({} as RoomConnectionState)),
        snapshot: snapshot(), // GAME_ENDED: back in LOBBY, the game still shown
      };
      mocked.rerender?.();
    });
    expect(screen.getByRole("button", { name: "Return to lobby" })).toBeInTheDocument();
    expect(warns()).toBe(true);
  });

  it("is removed after an explicit Leave room", async () => {
    await open(snapshot());
    expect(warns()).toBe(true);
    await userEvent.click(screen.getByRole("button", { name: "Leave room" }));
    await waitFor(() => {
      expect(where()).toBe("/rooms");
    });
    expect(warns()).toBe(false);
  });

  it("is not registered for a spectator", async () => {
    await open(spectating(), "SPECTATOR");
    expect(warns()).toBe(false);
  });

  it("is not registered in an In Progress room", async () => {
    await open(playing());
    expect(warns()).toBe(false);
  });
});
