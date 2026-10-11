import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { RoomListEnvelope, RoomListRow } from "./rooms-types";
import { joinRoom, listRooms } from "./roomsApi";
import { authWrapper, fakeAuth } from "../../test/authWrapper";
import { useRooms } from "./useRooms";

vi.mock("./roomsApi", () => ({ listRooms: vi.fn(), joinRoom: vi.fn() }));

const toast = vi.fn();
vi.mock("@astryxdesign/core/Toast", () => ({ useToast: () => toast }));

const navigate = vi.fn();
vi.mock("react-router", async (original) => ({
  ...(await original<typeof import("react-router")>()),
  useNavigate: () => navigate,
}));

const row = (id = "r-1"): RoomListRow => ({
  roomId: id,
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
});

const envelope = (over: Partial<RoomListEnvelope> = {}): RoomListEnvelope => ({
  content: [row()],
  pagination: { page: 1, size: 25, totalElements: 75, totalPages: 3 },
  reservedSlot: null,
  ...over,
});

const asked = () => vi.mocked(listRooms).mock.calls.map(([params]) => params);
const wrapper = authWrapper(fakeAuth());

async function loaded() {
  const hook = renderHook(() => useRooms(), { wrapper });
  await waitFor(() => {
    expect(hook.result.current.state.status).toBe("loaded");
  });
  return hook;
}

beforeEach(() => {
  vi.mocked(listRooms).mockReset().mockResolvedValue(envelope());
  vi.mocked(joinRoom).mockReset();
  toast.mockReset();
  navigate.mockReset();
});

describe("useRooms", () => {
  it("VW-ROOMS-001: starts loading, then asks for page 1, 25 rows, newest first (no sort param)", async () => {
    const { result } = renderHook(() => useRooms(), { wrapper });
    expect(result.current.state.status).toBe("loading");
    await waitFor(() => {
      expect(result.current.state.status).toBe("loaded");
    });
    expect(asked()[0]).toEqual({
      search: undefined,
      status: undefined,
      sort: undefined,
      page: 1,
      size: 25,
    });
    expect(result.current.sort).toBe("newest,desc");
  });

  it("sends the search, restarting at page 1", async () => {
    const { result } = await loaded();
    act(() => {
      result.current.setPage(3);
    });
    await waitFor(() => {
      expect(asked().at(-1)?.page).toBe(3);
    });
    act(() => {
      result.current.setSearch("chess");
    });
    await waitFor(() => {
      expect(asked().at(-1)).toMatchObject({ search: "chess", page: 1 });
    });
  });

  it("sends the status as a list, and counts it as one filter", async () => {
    const { result } = await loaded();
    expect(result.current.filterCount).toBe(0);
    act(() => {
      result.current.setStatus("IN_PROGRESS");
    });
    await waitFor(() => {
      expect(asked().at(-1)?.status).toEqual(["IN_PROGRESS"]);
    });
    expect(result.current.filterCount).toBe(1);
    act(() => {
      result.current.clearFilters();
    });
    await waitFor(() => {
      expect(asked().at(-1)?.status).toBeUndefined();
    });
  });

  it("sends a chosen sort as field,dir and omits it again for newest", async () => {
    const { result } = await loaded();
    act(() => {
      result.current.setSort("gameName,desc");
    });
    await waitFor(() => {
      expect(asked().at(-1)?.sort).toBe("gameName,desc");
    });
    act(() => {
      result.current.setSort("newest,desc");
    });
    await waitFor(() => {
      expect(asked().at(-1)?.sort).toBeUndefined();
    });
  });

  it("changes the page size and restarts at page 1", async () => {
    const { result } = await loaded();
    act(() => {
      result.current.setSize(50);
    });
    await waitFor(() => {
      expect(asked().at(-1)).toMatchObject({ size: 50, page: 1 });
    });
  });

  it("refresh asks again; a failed load reports error and retry recovers", async () => {
    vi.mocked(listRooms).mockRejectedValueOnce(new Error("down"));
    const { result } = renderHook(() => useRooms(), { wrapper });
    await waitFor(() => {
      expect(result.current.state.status).toBe("error");
    });
    act(() => {
      result.current.refresh();
    });
    await waitFor(() => {
      expect(result.current.state.status).toBe("loaded");
    });
    expect(asked()).toHaveLength(2);
  });

  it("joins, then opens the room", async () => {
    vi.mocked(joinRoom).mockResolvedValue({
      result: { room: { roomId: "r-1" } },
    } as Awaited<ReturnType<typeof joinRoom>>);
    const { result } = await loaded();
    act(() => {
      result.current.join(row(), "SPECTATOR");
    });
    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("/rooms/r-1");
    });
    expect(vi.mocked(joinRoom).mock.calls[0]?.slice(0, 2)).toEqual(["r-1", "SPECTATOR"]);
  });

  it("FR-LIST-003a: a refused join toasts, clears the busy row and reloads", async () => {
    vi.mocked(joinRoom).mockRejectedValue(new Error("full"));
    const { result } = await loaded();
    act(() => {
      result.current.join(row(), "PLAYER");
    });
    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({ type: "error" }));
    });
    await waitFor(() => {
      expect(result.current.joining).toBeNull();
    });
    await waitFor(() => {
      expect(asked()).toHaveLength(2);
    });
    expect(navigate).not.toHaveBeenCalled();
  });

  it("VW-ROOMS-005: rejoin opens the held room", async () => {
    const { result } = await loaded();
    act(() => {
      result.current.rejoin("r-7");
    });
    expect(navigate).toHaveBeenCalledWith("/rooms/r-7");
  });
});
