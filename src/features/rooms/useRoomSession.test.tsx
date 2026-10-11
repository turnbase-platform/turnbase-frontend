import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { authWrapper, fakeAuth } from "../../test/authWrapper";
import { REGISTERED } from "../../test/fakeApi";
import type { RoomResource, RoomStateSnapshot } from "./rooms-types";
import { leaveRoom } from "./roomsApi";
import { useRoomConnection } from "./useRoomConnection";
import { useRoomSession } from "./useRoomSession";

vi.mock("./roomsApi", () => ({ leaveRoom: vi.fn() }));
vi.mock("./useRoomConnection", () => ({ useRoomConnection: vi.fn() }));
const warn = vi.fn();
vi.mock("./useLeaveWarning", () => ({
  useLeaveWarning: (active: boolean) => {
    warn(active);
  },
}));

const navigate = vi.fn();
vi.mock("react-router", async (original) => ({
  ...(await original<typeof import("react-router")>()),
  useNavigate: () => navigate,
}));
const toast = vi.fn();
vi.mock("@astryxdesign/core/Toast", () => ({ useToast: () => toast }));

const room = { roomId: "r-1", inviteCode: "K7", minPlayers: 2, maxPlayers: 4 } as RoomResource;

const snapshot = (over: Partial<RoomStateSnapshot> = {}) =>
  ({
    state: "LOBBY",
    players: [{ playerId: REGISTERED.userId }],
    spectators: [],
    sessionId: null,
    gameFrontendUrl: null,
    ...over,
  }) as unknown as RoomStateSnapshot;

function connectionState(snap: RoomStateSnapshot | null, ended: unknown = null) {
  vi.mocked(useRoomConnection).mockReturnValue({
    snapshot: snap,
    connected: true,
    chatMessages: [],
    lastError: null,
    ended,
    connection: null,
    gameStalled: false,
  } as unknown as ReturnType<typeof useRoomConnection>);
}

const wrapper = authWrapper(fakeAuth(REGISTERED));
const render = () => renderHook(() => useRoomSession("r-1", room, "pod-a"), { wrapper });

beforeEach(() => {
  vi.mocked(leaveRoom)
    .mockReset()
    .mockResolvedValue(undefined);
  navigate.mockReset();
  toast.mockReset();
  warn.mockReset();
});

describe("useRoomSession", () => {
  it("opens the one socket with the affinity hint and carries the room's limits", () => {
    connectionState(snapshot());
    const { result } = render();
    expect(useRoomConnection).toHaveBeenCalledWith("r-1", "pod-a");
    expect(result.current).toMatchObject({
      userId: REGISTERED.userId,
      inviteCode: "K7",
      minPlayers: 2,
      maxPlayers: 4,
      game: null,
    });
  });

  it("FR-DC-008: warns before a reload while a player sits in the Lobby", () => {
    connectionState(snapshot());
    render();
    expect(warn).toHaveBeenLastCalledWith(true);
  });

  it("does not warn for a spectator, or once the room has ended", () => {
    connectionState(snapshot({ players: [] }));
    render();
    expect(warn).toHaveBeenLastCalledWith(false);
    connectionState(snapshot(), { kind: "CLOSED" });
    render();
    expect(warn).toHaveBeenLastCalledWith(false);
  });

  it("keeps the game on screen after the snapshot is back in the Lobby, until dismissed", () => {
    connectionState(
      snapshot({ state: "IN_PROGRESS", sessionId: "s-1", gameFrontendUrl: "https://g.example/" }),
    );
    const { result, rerender } = render();
    expect(result.current.game).toEqual({
      sessionId: "s-1",
      gameFrontendUrl: "https://g.example/",
    });

    connectionState(snapshot());
    rerender();
    expect(result.current.game).not.toBeNull();

    act(() => {
      result.current.returnToLobby();
    });
    expect(result.current.game).toBeNull();
  });

  it("leaves the room and returns to the list", async () => {
    connectionState(snapshot());
    const { result } = render();
    act(() => {
      result.current.leave();
    });
    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("/rooms");
    });
    expect(leaveRoom).toHaveBeenCalledWith("r-1");
    await waitFor(() => {
      expect(warn).toHaveBeenLastCalledWith(false);
    });
  });

  it("says so when leaving fails", async () => {
    vi.mocked(leaveRoom).mockRejectedValue(new Error("down"));
    connectionState(snapshot());
    const { result } = render();
    act(() => {
      result.current.leave();
    });
    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith({ type: "error", body: "Could not leave the room." });
    });
    expect(navigate).not.toHaveBeenCalled();
  });

  it("copies the invite link, or shows it when the clipboard is refused", async () => {
    connectionState(snapshot());
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    const { result } = render();
    act(() => {
      result.current.shareInvite();
    });
    const link = `${window.location.origin}/rooms/join/K7`;
    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith({ type: "info", body: "Invite link copied." });
    });
    expect(writeText).toHaveBeenCalledWith(link);

    writeText.mockRejectedValue(new Error("denied"));
    act(() => {
      result.current.shareInvite();
    });
    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith({ type: "info", body: link });
    });
  });
});
