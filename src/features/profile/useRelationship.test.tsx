import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { ApiError } from "../../shared/api";
import { removeFriend, sendFriendRequest } from "../friends/friendsApi";
import type { ProfileResponse } from "./profile-types";
import { useRelationship } from "./useRelationship";

vi.mock("../friends/friendsApi", () => ({ removeFriend: vi.fn(), sendFriendRequest: vi.fn() }));
const toast = vi.fn();
vi.mock("@astryxdesign/core/Toast", () => ({ useToast: () => toast }));

const profile = (over: Partial<ProfileResponse> = {}): ProfileResponse => ({
  username: "bob",
  userId: "u-2",
  kind: "REGISTERED",
  relationshipState: "NONE",
  ...over,
});

beforeEach(() => {
  vi.mocked(removeFriend).mockReset();
  vi.mocked(sendFriendRequest).mockReset();
  toast.mockReset();
});

describe("useRelationship", () => {
  it("starts from the profile's relationship state", () => {
    const { result } = renderHook(() => useRelationship(profile({ relationshipState: "FRIENDS" })));
    expect(result.current.state).toBe("FRIENDS");
  });

  it("a request that is accepted at once makes friends; otherwise it is pending", async () => {
    vi.mocked(sendFriendRequest).mockResolvedValueOnce({ outcome: "FRIENDS" } as never);
    const first = renderHook(() => useRelationship(profile()));
    act(() => {
      first.result.current.add();
    });
    await waitFor(() => {
      expect(first.result.current.state).toBe("FRIENDS");
    });

    vi.mocked(sendFriendRequest).mockResolvedValueOnce({ outcome: "REQUEST_SENT" } as never);
    const second = renderHook(() => useRelationship(profile()));
    act(() => {
      second.result.current.add();
    });
    await waitFor(() => {
      expect(second.result.current.state).toBe("REQUEST_SENT");
    });
    expect(sendFriendRequest).toHaveBeenCalledWith("bob");
  });

  it("FR-SOC-021: a refused send says the server's reason and stays put", async () => {
    vi.mocked(sendFriendRequest).mockRejectedValue(
      new ApiError(422, { status: 422, detail: "Not possible." }),
    );
    const { result } = renderHook(() => useRelationship(profile()));
    act(() => {
      result.current.add();
    });
    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith({ type: "error", body: "Not possible." });
    });
    expect(result.current.state).toBe("NONE");
    expect(result.current.isBusy).toBe(false);
  });

  it("any other failure says to try again", async () => {
    vi.mocked(sendFriendRequest).mockRejectedValue(new Error("down"));
    const { result } = renderHook(() => useRelationship(profile()));
    act(() => {
      result.current.add();
    });
    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith({
        type: "error",
        body: "Could not send the friend request. Please try again.",
      });
    });
  });

  it("removes a friend", async () => {
    vi.mocked(removeFriend).mockResolvedValue(undefined);
    const { result } = renderHook(() => useRelationship(profile({ relationshipState: "FRIENDS" })));
    act(() => {
      result.current.remove();
    });
    await waitFor(() => {
      expect(result.current.state).toBe("NONE");
    });
    expect(removeFriend).toHaveBeenCalledWith("u-2");
  });

  it("keeps the friend when removing fails", async () => {
    vi.mocked(removeFriend).mockRejectedValue(new Error("down"));
    const { result } = renderHook(() => useRelationship(profile({ relationshipState: "FRIENDS" })));
    act(() => {
      result.current.remove();
    });
    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith({
        type: "error",
        body: "Could not remove this friend. Please try again.",
      });
    });
    expect(result.current.state).toBe("FRIENDS");
  });

  it("cannot remove without a user id", () => {
    const { result } = renderHook(() =>
      useRelationship(profile({ userId: undefined, relationshipState: "FRIENDS" })),
    );
    act(() => {
      result.current.remove();
    });
    expect(removeFriend).not.toHaveBeenCalled();
  });
});
