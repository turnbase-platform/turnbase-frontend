import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FakeEventSource, REGISTERED, installFakeApi } from "../../test/fakeApi";
import { renderAt, where } from "../../test/renderApp";

const session = { "GET /api/auth/session": { body: REGISTERED } };
const listUrl = "GET /api/rooms?sort=createdAt%2Cdesc&page=1&size=25";

const row = (extra: object = {}) => ({
  roomId: "r-1",
  gameId: "g-1",
  gameName: "Tic-Tac-Toe",
  hostUsername: "bob",
  state: "LOBBY",
  playerCount: 1,
  playerCapacity: 2,
  minPlayers: 2,
  maxPlayers: 2,
  spectatingSupported: true,
  spectatorCount: 0,
  canJoin: true,
  canSpectate: true,
  ...extra,
});

const envelope = (content: unknown[]) => ({
  body: {
    content,
    pagination: { page: 1, size: 25, totalElements: content.length, totalPages: 1 },
    reservedSlot: null,
  },
});

const room = (extra: object = {}) => ({
  ...row(),
  gameVersion: "1.0.0",
  visibility: "INVITE_ONLY",
  hostUserId: "u-9",
  spectatingEnabled: true,
  spectatorCapacity: 8,
  version: 1,
  createdAt: "2026-10-01T10:00:00Z",
  ...extra,
});

beforeEach(() => {
  FakeEventSource.reset();
  vi.stubGlobal("EventSource", FakeEventSource);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("RoomsPage (VW-ROOMS-001…004)", () => {
  it("lists rooms newest-first and joins as a player, then opens the room", async () => {
    const api = installFakeApi({
      ...session,
      [listUrl]: envelope([row()]),
      "POST /api/rooms/r-1/participants": { body: { room: room(), releasedRoom: null } },
    });
    renderAt("/rooms");

    await userEvent.click(await screen.findByRole("button", { name: /^Join Tic-Tac-Toe/ }));
    await waitFor(() => {
      expect(where()).toBe("/rooms/r-1");
    });
    expect(api.calls.find((c) => c.method === "POST")?.body).toEqual({ role: "PLAYER" });
  });

  it("shows only the actions the server flags allow", async () => {
    installFakeApi({
      ...session,
      [listUrl]: envelope([row({ canJoin: false })]),
    });
    renderAt("/rooms");

    expect(await screen.findByRole("button", { name: /^Spectate/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Join/ })).toBeNull();
  });

  it("filters server-side and refreshes", async () => {
    const api = installFakeApi({
      ...session,
      [listUrl]: envelope([row()]),
      "GET /api/rooms?search=chess&sort=createdAt%2Cdesc&page=1&size=25": envelope([]),
    });
    renderAt("/rooms");
    await screen.findByText("bob");

    await userEvent.type(screen.getByLabelText("Search rooms"), "chess");
    expect(await screen.findByText("No rooms to join right now")).toBeInTheDocument();

    const before = api.calls.length;
    await userEvent.click(screen.getByRole("button", { name: "Refresh" }));
    await waitFor(() => {
      expect(api.calls.length).toBeGreaterThan(before);
    });
  });
});

describe("JoinByCodePage (VW-JOIN-001…003)", () => {
  const codeUrl = "GET /api/rooms?inviteCode=K7";
  const joinUrl = "POST /api/rooms/r-1/participants?inviteCode=K7";

  it("asks Player or Spectator only when both are open", async () => {
    const api = installFakeApi({
      ...session,
      [codeUrl]: envelope([room()]),
      [joinUrl]: { body: { room: room(), releasedRoom: null } },
    });
    renderAt("/rooms/join/K7");

    await userEvent.click(await screen.findByRole("button", { name: "Spectator" }));
    await waitFor(() => {
      expect(where()).toBe("/rooms/r-1");
    });
    expect(api.calls.find((c) => c.method === "POST")?.body).toEqual({ role: "SPECTATOR" });
  });

  it("joins straight away when only one role is open", async () => {
    const api = installFakeApi({
      ...session,
      [codeUrl]: envelope([room({ canSpectate: false })]),
      [joinUrl]: { body: { room: room(), releasedRoom: null } },
    });
    renderAt("/rooms/join/K7");

    await waitFor(() => {
      expect(where()).toBe("/rooms/r-1");
    });
    expect(api.calls.find((c) => c.method === "POST")?.body).toEqual({ role: "PLAYER" });
  });

  it("says so for an unknown code", async () => {
    installFakeApi({ ...session, [codeUrl]: envelope([]) });
    renderAt("/rooms/join/K7");
    expect(await screen.findByText(/not valid, or the room no longer exists/)).toBeInTheDocument();
  });

  it("says so when no role is available", async () => {
    installFakeApi({
      ...session,
      [codeUrl]: envelope([room({ canJoin: false, canSpectate: false })]),
    });
    renderAt("/rooms/join/K7");
    expect(await screen.findByText(/no available role/)).toBeInTheDocument();
  });
});
