import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReservedSlot, RoomListRow } from "./rooms-types";
import type { Rooms } from "./useRooms";
import { authWrapper, fakeAuth } from "../../test/authWrapper";
import { RoomsView } from "./RoomsView";

const ROW: RoomListRow = {
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
  spectatorCount: 7,
  canJoin: true,
  canSpectate: true,
};

function model(over: Partial<Rooms> = {}): Rooms {
  return {
    state: {
      status: "loaded",
      result: {
        content: [ROW],
        pagination: { page: 1, size: 25, totalElements: 60, totalPages: 3 },
        reservedSlot: null,
      },
    },
    search: "",
    status: "ALL",
    sort: "newest,desc",
    page: 1,
    size: 25,
    joining: null,
    filterCount: 0,
    appliedCount: 0,
    setSearch: vi.fn(),
    setStatus: vi.fn(),
    setSort: vi.fn(),
    setSize: vi.fn(),
    setPage: vi.fn(),
    clearFilters: vi.fn(),
    refresh: vi.fn(),
    join: vi.fn(),
    joinByCode: vi.fn(),
    rejoin: vi.fn(),
    ...over,
  };
}

function view(rooms: Rooms, filtersOpen = false) {
  const onToggleFilters = vi.fn();
  render(<RoomsView rooms={rooms} filtersOpen={filtersOpen} onToggleFilters={onToggleFilters} />, {
    wrapper: authWrapper(fakeAuth()),
  });
  return { onToggleFilters };
}

const withContent = (content: RoomListRow[], reservedSlot: ReservedSlot | null = null) =>
  ({
    status: "loaded",
    result: {
      content,
      pagination: { page: 1, size: 25, totalElements: content.length, totalPages: 1 },
      reservedSlot,
    },
  }) as Rooms["state"];

describe("RoomsView", () => {
  it("VW-ROOMS-001: a row shows game, host, status, players and spectators", () => {
    view(model());
    expect(screen.getByRole("heading", { level: 1, name: "Rooms" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Tic-Tac-Toe" })).toBeInTheDocument();
    expect(screen.getByText("Host bob")).toBeInTheDocument();
    expect(screen.getByText("Lobby")).toBeInTheDocument();
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("shows no spectator count where the game cannot be spectated, and 'In progress' for a running room", () => {
    view(
      model({
        state: withContent([{ ...ROW, state: "IN_PROGRESS", spectatingSupported: false }]),
      }),
    );
    expect(screen.getByText("In progress")).toBeInTheDocument();
    expect(screen.queryByText("7")).toBeNull();
  });

  it("shows no spectator chip for an empty gallery", () => {
    view(model({ state: withContent([{ ...ROW, spectatorCount: 0 }]) }));
    expect(screen.queryByText("0")).toBeNull();
  });

  it("Create room goes to the catalog, where a game is picked", () => {
    view(model());
    expect(screen.getByRole("link", { name: "Create room" })).toHaveAttribute("href", "/games");
  });

  it("Got a code? sends a trimmed code on, and waits for one worth sending", async () => {
    const rooms = model();
    view(rooms);
    const join = screen.getByRole("button", { name: "Join with code" });
    expect(join).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Room code"), "  AB-12 ");
    await userEvent.click(join);
    expect(rooms.joinByCode).toHaveBeenCalledWith("AB-12");
  });

  it("offers only the actions the server flags allow", () => {
    view(model({ state: withContent([{ ...ROW, canJoin: false }]) }));
    expect(
      screen.getByRole("button", { name: "Spectate Tic-Tac-Toe hosted by bob" }),
    ).toBeEnabled();
    expect(screen.queryByRole("button", { name: /^Join Tic/ })).toBeNull();
  });

  it("reports the row and role when Join or Spectate is pressed", async () => {
    const rooms = model();
    view(rooms);
    await userEvent.click(screen.getByRole("button", { name: "Join Tic-Tac-Toe hosted by bob" }));
    expect(rooms.join).toHaveBeenCalledWith(ROW, "PLAYER");
    await userEvent.click(
      screen.getByRole("button", { name: "Spectate Tic-Tac-Toe hosted by bob" }),
    );
    expect(rooms.join).toHaveBeenCalledWith(ROW, "SPECTATOR");
  });

  it("reports the search text", async () => {
    const rooms = model();
    view(rooms);
    await userEvent.type(screen.getByLabelText("Search rooms"), "c");
    expect(vi.mocked(rooms.setSearch).mock.calls[0]?.[0]).toBe("c");
  });

  it("Refresh asks the hook to reload", async () => {
    const rooms = model();
    view(rooms);
    await userEvent.click(screen.getByRole("button", { name: "Refresh" }));
    expect(rooms.refresh).toHaveBeenCalled();
  });

  it("the filter button toggles the panel; the panel carries the status filter", async () => {
    const rooms = model({ status: "LOBBY", filterCount: 1, appliedCount: 1 });
    const { onToggleFilters } = view(rooms, true);
    await userEvent.click(screen.getByRole("button", { name: /Filters/ }));
    expect(onToggleFilters).toHaveBeenCalled();
    expect(screen.getByRole("combobox", { name: "Status" })).toHaveTextContent("Lobby");
    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(rooms.clearFilters).toHaveBeenCalled();
  });

  it("offers newest first as a sort that has no direction", () => {
    view(model());
    expect(screen.getByRole("combobox", { name: "Sort by" })).toHaveTextContent("Newest");
    expect(screen.getByRole("button", { name: /Switch to ascending/ })).toBeDisabled();
  });

  it("VW-ROOMS-005: a held slot is a card with Rejoin", async () => {
    const rooms = model({
      state: withContent([], { roomId: "r-7", gameName: "Hex Duel", graceRemainingSeconds: 42 }),
    });
    view(rooms);
    expect(screen.getByText(/disconnected from Hex Duel/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Rejoin" }));
    expect(rooms.rejoin).toHaveBeenCalledWith("r-7");
  });

  it("says so when there are no rooms", () => {
    view(model({ state: withContent([]) }));
    expect(screen.getByText("No rooms to join right now")).toBeInTheDocument();
  });

  it("says so when the list cannot load, and Try again reloads", async () => {
    const rooms = model({ state: { status: "error" } });
    view(rooms);
    expect(screen.getByText("Could not load the rooms. Please try again.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(rooms.refresh).toHaveBeenCalled();
  });

  it("shows Loading… while the first page loads", () => {
    view(model({ state: { status: "loading" } }));
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });
});
