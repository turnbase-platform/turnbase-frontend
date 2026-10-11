import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { authWrapper, fakeAuth } from "../../test/authWrapper";
import { REGISTERED } from "../../test/fakeApi";
import { ApiError } from "../../shared/api";
import {
  acceptFriendRequest,
  deleteFriendRequest,
  fetchFriends,
  fetchPendingRequests,
  removeFriend,
} from "./friendsApi";
import type { PendingRequest } from "./friends-types";
import { useFriends } from "./useFriends";

vi.mock("./friendsApi", () => ({
  acceptFriendRequest: vi.fn(),
  deleteFriendRequest: vi.fn(),
  fetchFriends: vi.fn(),
  fetchPendingRequests: vi.fn(),
  removeFriend: vi.fn(),
}));
const toast = vi.fn();
vi.mock("@astryxdesign/core/Toast", () => ({ useToast: () => toast }));

const page = <T,>(content: T[]) => ({
  content,
  pagination: { page: 1, size: 25, totalElements: content.length, totalPages: 1 },
});
const request = (over: Partial<PendingRequest>): PendingRequest => ({
  requestId: "r-1",
  direction: "INCOMING",
  counterpartUsername: "carol",
  createdAt: "now",
  expiresAt: "later",
  ...over,
});

const wrapper = authWrapper(fakeAuth(REGISTERED));
const render = () => renderHook(() => useFriends(), { wrapper });

beforeEach(() => {
  vi.mocked(fetchFriends)
    .mockReset()
    .mockResolvedValue(page([{ userId: "u-2", username: "bob" }]));
  vi.mocked(fetchPendingRequests)
    .mockReset()
    .mockResolvedValue(
      page([
        request({}),
        request({ requestId: "r-2", direction: "OUTGOING", counterpartUsername: "dan" }),
      ]),
    );
  vi.mocked(acceptFriendRequest)
    .mockReset()
    .mockResolvedValue({ friend: { userId: "u-3", username: "carol" } });
  vi.mocked(deleteFriendRequest).mockReset().mockResolvedValue(undefined);
  vi.mocked(removeFriend).mockReset().mockResolvedValue(undefined);
  toast.mockReset();
});

describe("useFriends", () => {
  it("loads the viewer's friends and splits requests by direction", async () => {
    const { result } = render();
    expect(result.current.friends.status).toBe("loading");
    await waitFor(() => {
      expect(result.current.requests.status).toBe("ready");
    });
    expect(fetchFriends).toHaveBeenCalledWith(REGISTERED.username);
    expect(result.current.incoming.map((r) => r.counterpartUsername)).toEqual(["carol"]);
    expect(result.current.outgoing.map((r) => r.counterpartUsername)).toEqual(["dan"]);
  });

  it("reports each list's failure on its own", async () => {
    vi.mocked(fetchFriends).mockRejectedValue(new Error("down"));
    const { result } = render();
    await waitFor(() => {
      expect(result.current.friends.status).toBe("error");
    });
    expect(result.current.requests.status).toBe("ready");
  });

  it.each([
    ["accept", () => acceptFriendRequest, "r-1"],
    ["decline", () => deleteFriendRequest, "r-1"],
  ] as const)("%s sends the request id, then re-reads both lists", async (action, api, id) => {
    const { result } = render();
    await waitFor(() => {
      expect(result.current.requests.status).toBe("ready");
    });
    act(() => {
      result.current[action](result.current.incoming[0]);
    });
    await waitFor(() => {
      expect(api()).toHaveBeenCalledWith(id);
    });
    await waitFor(() => {
      expect(fetchPendingRequests).toHaveBeenCalledTimes(2);
    });
    expect(fetchFriends).toHaveBeenCalledTimes(2);
  });

  it("cancels a sent request and removes a friend", async () => {
    const { result } = render();
    await waitFor(() => {
      expect(result.current.requests.status).toBe("ready");
    });
    act(() => {
      result.current.cancel(result.current.outgoing[0]);
      result.current.remove({ userId: "u-2", username: "bob" });
    });
    await waitFor(() => {
      expect(deleteFriendRequest).toHaveBeenCalledWith("r-2");
    });
    expect(removeFriend).toHaveBeenCalledWith("u-2");
  });

  it("names the failed action, adding the server's reason for a 422", async () => {
    vi.mocked(removeFriend).mockRejectedValue(new ApiError(500, { status: 500 }));
    vi.mocked(acceptFriendRequest).mockRejectedValue(
      new ApiError(422, { status: 422, detail: "Friend limit reached." }),
    );
    const { result } = render();
    await waitFor(() => {
      expect(result.current.requests.status).toBe("ready");
    });
    act(() => {
      result.current.remove({ userId: "u-2", username: "bob" });
    });
    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith({
        type: "error",
        body: "Could not remove bob from your friends.",
      });
    });
    act(() => {
      result.current.accept(result.current.incoming[0]);
    });
    await waitFor(() => {
      expect(toast).toHaveBeenLastCalledWith({
        type: "error",
        body: expect.stringContaining("Could not accept carol's") as string,
      });
    });
  });
});
