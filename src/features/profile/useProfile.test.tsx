import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { ApiError } from "../../shared/api";
import { fetchProfile } from "./profileApi";
import { useProfile } from "./useProfile";

vi.mock("./profileApi", () => ({ fetchProfile: vi.fn() }));

beforeEach(() => {
  vi.mocked(fetchProfile).mockReset();
});

describe("useProfile", () => {
  it("loads the profile envelope", async () => {
    vi.mocked(fetchProfile).mockResolvedValue({ username: "alice" });
    const { result } = renderHook(() => useProfile("alice"));
    expect(result.current.state.status).toBe("loading");
    await waitFor(() => {
      expect(result.current.state).toEqual({ status: "loaded", profile: { username: "alice" } });
    });
    expect(fetchProfile).toHaveBeenCalledWith("alice");
  });

  it("maps a 404 to not-found and anything else to error", async () => {
    vi.mocked(fetchProfile).mockRejectedValueOnce(new ApiError(404, { status: 404 }));
    const missing = renderHook(() => useProfile("nobody"));
    await waitFor(() => {
      expect(missing.result.current.state.status).toBe("not-found");
    });

    vi.mocked(fetchProfile).mockRejectedValueOnce(new Error("down"));
    const broken = renderHook(() => useProfile("alice"));
    await waitFor(() => {
      expect(broken.result.current.state.status).toBe("error");
    });
  });

  it("retry loads again", async () => {
    vi.mocked(fetchProfile).mockRejectedValueOnce(new Error("down"));
    const { result } = renderHook(() => useProfile("alice"));
    await waitFor(() => {
      expect(result.current.state.status).toBe("error");
    });
    vi.mocked(fetchProfile).mockResolvedValue({ username: "alice" });
    act(() => {
      result.current.retry();
    });
    expect(result.current.state.status).toBe("loading");
    await waitFor(() => {
      expect(result.current.state.status).toBe("loaded");
    });
  });
});
