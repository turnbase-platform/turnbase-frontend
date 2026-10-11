import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { fetchFriends } from "../friends/friendsApi";
import { fetchOwnedGames } from "./profileApi";
import { useProfileFriends, useUploadedGames } from "./useProfileLists";

vi.mock("../friends/friendsApi", () => ({ fetchFriends: vi.fn() }));
vi.mock("./profileApi", () => ({ fetchOwnedGames: vi.fn() }));

beforeEach(() => {
  vi.mocked(fetchFriends).mockReset();
  vi.mocked(fetchOwnedGames).mockReset();
});

describe("useProfileFriends", () => {
  it("unwraps the page into a plain list", async () => {
    vi.mocked(fetchFriends).mockResolvedValue({
      content: [{ userId: "u-2", username: "bob" }],
    } as never);
    const { result } = renderHook(() => useProfileFriends("alice"));
    await waitFor(() => {
      expect(result.current.state).toEqual({
        status: "loaded",
        items: [{ userId: "u-2", username: "bob" }],
      });
    });
    expect(fetchFriends).toHaveBeenCalledWith("alice");
  });

  it("reports a failure, and retry loads again", async () => {
    vi.mocked(fetchFriends).mockRejectedValueOnce(new Error("down"));
    const { result } = renderHook(() => useProfileFriends("alice"));
    await waitFor(() => {
      expect(result.current.state.status).toBe("error");
    });
    vi.mocked(fetchFriends).mockResolvedValue({ content: [] } as never);
    act(() => {
      result.current.retry();
    });
    await waitFor(() => {
      expect(result.current.state).toEqual({ status: "loaded", items: [] });
    });
  });
});

describe("useUploadedGames", () => {
  it("loads the user's uploaded games", async () => {
    vi.mocked(fetchOwnedGames).mockResolvedValue({ content: [{ gameId: "g-1" }] } as never);
    const { result } = renderHook(() => useUploadedGames("alice"));
    await waitFor(() => {
      expect(result.current.state.status).toBe("loaded");
    });
    expect(fetchOwnedGames).toHaveBeenCalledWith("alice");
  });
});
