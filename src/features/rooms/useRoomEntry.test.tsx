import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { ApiError } from "../../shared/api";
import type { RoomResource } from "./rooms-types";
import { getRoom, joinRoom } from "./roomsApi";
import { useRoomEntry } from "./useRoomEntry";

vi.mock("./roomsApi", () => ({ getRoom: vi.fn(), joinRoom: vi.fn() }));

const room = (over: Partial<RoomResource> = {}) =>
  ({
    roomId: "r-1",
    gameName: "Tic-Tac-Toe",
    hostUsername: "bob",
    viewerRole: null,
    canJoin: true,
    canSpectate: true,
    ...over,
  }) as RoomResource;

const joined = (over: Partial<RoomResource> = {}, instanceHint: string | null = null) =>
  ({ result: { room: room(over) }, instanceHint }) as Awaited<ReturnType<typeof joinRoom>>;

beforeEach(() => {
  vi.mocked(getRoom).mockReset();
  vi.mocked(joinRoom).mockReset();
});

describe("useRoomEntry", () => {
  it("IMP-GATE-95: opening a room never takes a seat; it asks for a role", async () => {
    vi.mocked(getRoom).mockResolvedValue({ room: room(), instanceHint: "pod-a" });
    const { result } = renderHook(() => useRoomEntry("r-1"));
    expect(result.current.entry.status).toBe("resolving");
    await waitFor(() => {
      expect(result.current.entry.status).toBe("prompt");
    });
    expect(joinRoom).not.toHaveBeenCalled();
  });

  it("FR-REJOIN-003: a caller who holds a seat re-enters with the idempotent join", async () => {
    vi.mocked(getRoom).mockResolvedValue({
      room: room({ viewerRole: "SPECTATOR" }),
      instanceHint: "pod-a",
    });
    vi.mocked(joinRoom).mockResolvedValue(joined({ viewerRole: "SPECTATOR" }, "pod-b"));
    const { result } = renderHook(() => useRoomEntry("r-1"));
    await waitFor(() => {
      expect(result.current.entry.status).toBe("ready");
    });
    expect(joinRoom).toHaveBeenCalledWith("r-1", "SPECTATOR");
    expect(result.current.entry).toMatchObject({ instanceHint: "pod-b" });
  });

  it("keeps the lookup's affinity hint when the join sends none", async () => {
    vi.mocked(getRoom).mockResolvedValue({
      room: room({ viewerRole: "PLAYER" }),
      instanceHint: "pod-a",
    });
    vi.mocked(joinRoom).mockResolvedValue(joined());
    const { result } = renderHook(() => useRoomEntry("r-1"));
    await waitFor(() => {
      expect(result.current.entry).toMatchObject({ status: "ready", instanceHint: "pod-a" });
    });
  });

  it("is unavailable for a room with no role open", async () => {
    vi.mocked(getRoom).mockResolvedValue({
      room: room({ canJoin: false, canSpectate: false }),
      instanceHint: null,
    });
    const { result } = renderHook(() => useRoomEntry("r-1"));
    await waitFor(() => {
      expect(result.current.entry.status).toBe("unavailable");
    });
  });

  it("is unavailable when the lookup fails", async () => {
    vi.mocked(getRoom).mockRejectedValue(new Error("404"));
    const { result } = renderHook(() => useRoomEntry("r-1"));
    await waitFor(() => {
      expect(result.current.entry.status).toBe("unavailable");
    });
  });

  it("VW-JOIN-002: enrols with the chosen role and becomes ready", async () => {
    vi.mocked(getRoom).mockResolvedValue({ room: room(), instanceHint: "pod-a" });
    vi.mocked(joinRoom).mockResolvedValue(joined({ viewerRole: "PLAYER" }));
    const { result } = renderHook(() => useRoomEntry("r-1"));
    await waitFor(() => {
      expect(result.current.entry.status).toBe("prompt");
    });
    act(() => {
      result.current.enrol("PLAYER");
    });
    await waitFor(() => {
      expect(result.current.entry.status).toBe("ready");
    });
    expect(joinRoom).toHaveBeenCalledWith("r-1", "PLAYER");
  });

  it("says why an enrolment was refused and stays on the prompt", async () => {
    vi.mocked(getRoom).mockResolvedValue({ room: room(), instanceHint: null });
    vi.mocked(joinRoom).mockRejectedValue(
      new ApiError(409, { status: 409, detail: "The room is full." }),
    );
    const { result } = renderHook(() => useRoomEntry("r-1"));
    await waitFor(() => {
      expect(result.current.entry.status).toBe("prompt");
    });
    act(() => {
      result.current.enrol("PLAYER");
    });
    await waitFor(() => {
      expect(result.current.failure).toBe("The room is full.");
    });
    expect(result.current.entry.status).toBe("prompt");
  });

  it("ignores enrol outside the prompt", () => {
    vi.mocked(getRoom).mockReturnValue(new Promise(() => undefined));
    const { result } = renderHook(() => useRoomEntry("r-1"));
    act(() => {
      result.current.enrol("PLAYER");
    });
    expect(joinRoom).not.toHaveBeenCalled();
  });
});
