import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FakeEventSource, GUEST, REGISTERED, ANONYMOUS, installFakeApi } from "../../test/fakeApi";
import { renderAt, where } from "../../test/renderApp";

const game = (n: number, extra: object = {}) => ({
  gameId: `g-${String(n)}`,
  title: `Game ${String(n)}`,
  authorUsername: "TurnBase",
  shortDescription: `About game ${String(n)}`,
  minPlayers: 2,
  maxPlayers: 4,
  supportsAi: true,
  supportsSpectators: false,
  version: "1.0.0",
  badge: "OFFICIAL",
  createdAt: "2026-08-01T10:00:00Z",
  updatedAt: "2026-09-01T10:00:00Z",
  ...extra,
});

const page = (content: unknown[], pageNo = 1, totalPages = 1) => ({
  body: {
    content,
    pagination: { page: pageNo, size: 25, totalElements: totalPages * 25, totalPages },
  },
});

const defaultUrl = "GET /api/games?sort=createdAt%2Cdesc&page=1&size=25";

beforeEach(() => {
  FakeEventSource.reset();
  vi.stubGlobal("EventSource", FakeEventSource);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("CatalogPage (VW-CAT-001…003, FR-CAT-001…010)", () => {
  it("FR-CAT-007/009/010: lists games newest-first with a detail link and a badge", async () => {
    const api = installFakeApi({
      "GET /api/auth/session": ANONYMOUS,
      [defaultUrl]: page([game(1), game(2, { badge: "VERIFIED" })]),
    });
    renderAt("/games");

    expect(await screen.findByRole("link", { name: "Game 1" })).toHaveAttribute(
      "href",
      "/games/g-1",
    );
    expect(screen.getByText("Official")).toBeInTheDocument();
    expect(screen.getByText("Verified")).toBeInTheDocument();
    expect(api.calls.some((call) => call.path === defaultUrl.slice(4))).toBe(true);
  });

  it("VW-CAT-003: Create Room is hidden for Unauth, present for Guest/Registered", async () => {
    installFakeApi({
      "GET /api/auth/session": ANONYMOUS,
      [defaultUrl]: page([game(1)]),
    });
    renderAt("/games");
    await screen.findByRole("link", { name: "Game 1" });
    expect(screen.queryByRole("button", { name: "Create room" })).toBeNull();
    cleanup();

    installFakeApi({
      "GET /api/auth/session": { body: REGISTERED },
      "GET /api/notifications/unread-count": { body: { unreadCount: 0 } },
      [defaultUrl]: page([game(1)]),
    });
    renderAt("/games");
    expect(await screen.findByRole("button", { name: "Create room" })).toBeInTheDocument();
  });

  it("FR-CAT-008: Create Room creates a room for that game and opens it", async () => {
    const api = installFakeApi({
      "GET /api/auth/session": { body: REGISTERED },
      "GET /api/notifications/unread-count": { body: { unreadCount: 0 } },
      [defaultUrl]: page([game(1)]),
      "POST /api/rooms": { status: 201, body: { roomId: "r-9" } },
    });
    renderAt("/games");
    await userEvent.click(await screen.findByRole("button", { name: "Create room" }));
    // FR-CREATE-001: game 1 does not support spectators, so the dialog does not ask.
    expect(screen.queryByRole("switch", { name: "Allow spectators" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(where()).toBe("/rooms/r-9");
    });
    expect(api.calls.find((call) => call.method === "POST")?.body).toEqual({
      gameId: "g-1",
      visibility: "PUBLIC",
    });
  });

  it("FR-CREATE-001/002: posts the chosen visibility and spectating for a game that allows it", async () => {
    const api = installFakeApi({
      "GET /api/auth/session": { body: REGISTERED },
      "GET /api/notifications/unread-count": { body: { unreadCount: 0 } },
      [defaultUrl]: page([game(1, { supportsSpectators: true })]),
      "POST /api/rooms": { status: 201, body: { roomId: "r-9" } },
    });
    renderAt("/games");
    await userEvent.click(await screen.findByRole("button", { name: "Create room" }));
    await userEvent.click(screen.getByRole("radio", { name: "Friends Only" }));
    await userEvent.click(screen.getByRole("switch", { name: "Allow spectators" }));
    await userEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(where()).toBe("/rooms/r-9");
    });
    expect(api.calls.find((call) => call.method === "POST")?.body).toEqual({
      gameId: "g-1",
      visibility: "FRIENDS_ONLY",
      spectatingEnabled: true,
    });
  });

  it("FR-LIST-006 / FR-GUEST-007: Friends Only is not offered to a Guest", async () => {
    installFakeApi({
      "GET /api/auth/session": { body: GUEST },
      "GET /api/notifications/unread-count": { body: { unreadCount: 0 } },
      [defaultUrl]: page([game(1)]),
    });
    renderAt("/games");
    await userEvent.click(await screen.findByRole("button", { name: "Create room" }));
    expect(screen.getByRole("radio", { name: "Public" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Invite Only" })).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: "Friends Only" })).toBeNull();
  });

  it("FR-CAT-003: a row expands to its short description; only one at a time", async () => {
    installFakeApi({
      "GET /api/auth/session": ANONYMOUS,
      [defaultUrl]: page([game(1), game(2)]),
    });
    renderAt("/games");
    const [first, second] = await screen.findAllByRole("button", { name: "Show description" });

    await userEvent.click(first);
    expect(screen.getByText("About game 1")).toBeInTheDocument();

    await userEvent.click(second);
    expect(screen.getByText("About game 2")).toBeInTheDocument();
    expect(screen.queryByText("About game 1")).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Hide description" }));
    expect(screen.queryByText("About game 2")).toBeNull();
  });

  it("FR-CAT-005: search is a server-side query parameter, and restarts at page 1", async () => {
    const api = installFakeApi({
      "GET /api/auth/session": ANONYMOUS,
      [defaultUrl]: page([game(1)]),
      "GET /api/games?search=c&sort=createdAt%2Cdesc&page=1&size=25": page([]),
    });
    renderAt("/games");
    await screen.findByRole("link", { name: "Game 1" });

    await userEvent.type(screen.getByLabelText("Search games"), "c");

    expect(await screen.findByText("No games match your search")).toBeInTheDocument();
    expect(api.calls.map((call) => call.path)).toContain(
      "/api/games?search=c&sort=createdAt%2Cdesc&page=1&size=25",
    );
  });

  it("FR-CAT-004: paging uses the shared envelope and requests the chosen page", async () => {
    const api = installFakeApi({
      "GET /api/auth/session": ANONYMOUS,
      [defaultUrl]: page([game(1)], 1, 3),
      "GET /api/games?sort=createdAt%2Cdesc&page=2&size=25": page([game(2)], 2, 3),
    });
    renderAt("/games");
    await screen.findByRole("link", { name: "Game 1" });

    await userEvent.click(screen.getByRole("button", { name: /next/i }));

    expect(await screen.findByRole("link", { name: "Game 2" })).toBeInTheDocument();
    expect(api.calls.map((call) => call.path)).toContain(
      "/api/games?sort=createdAt%2Cdesc&page=2&size=25",
    );
  });
});
