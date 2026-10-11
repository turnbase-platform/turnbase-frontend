import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { RoomResource } from "./rooms-types";
import { joinRoom, resolveInviteCode } from "./roomsApi";
import { authWrapper, fakeAuth } from "../../test/authWrapper";
import { useJoinByCode } from "./useJoinByCode";

vi.mock("./roomsApi", () => ({ resolveInviteCode: vi.fn(), joinRoom: vi.fn() }));

const navigate = vi.fn();
vi.mock("react-router", async (original) => ({
  ...(await original<typeof import("react-router")>()),
  useNavigate: () => navigate,
}));

const room = (over: Partial<RoomResource> = {}) =>
  ({
    roomId: "r-1",
    gameName: "Tic-Tac-Toe",
    hostUsername: "bob",
    canJoin: true,
    canSpectate: true,
    ...over,
  }) as RoomResource;

const resolves = (content: RoomResource[]) =>
  vi.mocked(resolveInviteCode).mockResolvedValue({ content });

const wrapper = authWrapper(fakeAuth());

beforeEach(() => {
  vi.mocked(resolveInviteCode).mockReset();
  vi.mocked(joinRoom)
    .mockReset()
    .mockResolvedValue({ result: { room: room() } } as Awaited<ReturnType<typeof joinRoom>>);
  navigate.mockReset();
});

describe("useJoinByCode", () => {
  it("VW-JOIN-002: asks for a role only when both are open", async () => {
    resolves([room()]);
    const { result } = renderHook(() => useJoinByCode("K7"), { wrapper });
    expect(result.current.state.status).toBe("resolving");
    await waitFor(() => {
      expect(result.current.state.status).toBe("choose");
    });
    expect(joinRoom).not.toHaveBeenCalled();

    act(() => {
      result.current.enter("SPECTATOR");
    });
    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("/rooms/r-1", { replace: true });
    });
    expect(joinRoom).toHaveBeenCalledWith("r-1", "SPECTATOR", { inviteCode: "K7" });
  });

  it.each([
    [{ canSpectate: false }, "PLAYER"],
    [{ canJoin: false }, "SPECTATOR"],
  ])("VW-JOIN-001: with only one role open (%j) it joins as %s at once", async (flags, role) => {
    resolves([room(flags)]);
    renderHook(() => useJoinByCode("K7"), { wrapper });
    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("/rooms/r-1", { replace: true });
    });
    expect(joinRoom).toHaveBeenCalledWith("r-1", role, { inviteCode: "K7" });
  });

  it("§3.1: an empty answer is a wrong code, an expired one or a closed room", async () => {
    resolves([]);
    const { result } = renderHook(() => useJoinByCode("K7"), { wrapper });
    await waitFor(() => {
      expect(result.current.state).toEqual({
        status: "failed",
        reason: expect.stringMatching(/not valid, has expired, or the room has closed/) as string,
      });
    });
  });

  it("fails when neither role is open", async () => {
    resolves([room({ canJoin: false, canSpectate: false })]);
    const { result } = renderHook(() => useJoinByCode("K7"), { wrapper });
    await waitFor(() => {
      expect(result.current.state.status).toBe("failed");
    });
  });

  it("fails when the lookup itself fails", async () => {
    vi.mocked(resolveInviteCode).mockRejectedValue(new Error("down"));
    const { result } = renderHook(() => useJoinByCode("K7"), { wrapper });
    await waitFor(() => {
      expect(result.current.state).toEqual({
        status: "failed",
        reason: "Could not look up this invite.",
      });
    });
  });

  it("reports a refused join and does not navigate", async () => {
    resolves([room()]);
    vi.mocked(joinRoom).mockRejectedValue(new Error("full"));
    const { result } = renderHook(() => useJoinByCode("K7"), { wrapper });
    await waitFor(() => {
      expect(result.current.state.status).toBe("choose");
    });
    act(() => {
      result.current.enter("PLAYER");
    });
    await waitFor(() => {
      expect(result.current.state.status).toBe("failed");
    });
    expect(navigate).not.toHaveBeenCalled();
  });
});
