import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { fetchStatistics } from "./profileApi";
import { useStatistics } from "./useStatistics";

vi.mock("./profileApi", () => ({ fetchStatistics: vi.fn() }));

beforeEach(() => {
  vi.mocked(fetchStatistics).mockReset();
});

describe("useStatistics", () => {
  it("FR-STATS-020: loads the figures live", async () => {
    vi.mocked(fetchStatistics).mockResolvedValue({ totalPlayed: 17, mostPlayedGame: null });
    const { result } = renderHook(() => useStatistics("alice"));
    await waitFor(() => {
      expect(result.current.state).toEqual({
        status: "loaded",
        statistics: { totalPlayed: 17, mostPlayedGame: null },
      });
    });
    expect(fetchStatistics).toHaveBeenCalledWith("alice");
  });

  it("reports a failure and retries", async () => {
    vi.mocked(fetchStatistics).mockRejectedValueOnce(new Error("down"));
    const { result } = renderHook(() => useStatistics("alice"));
    await waitFor(() => {
      expect(result.current.state.status).toBe("error");
    });
    vi.mocked(fetchStatistics).mockResolvedValue({ totalPlayed: 0, mostPlayedGame: null });
    act(() => {
      result.current.retry();
    });
    await waitFor(() => {
      expect(result.current.state.status).toBe("loaded");
    });
  });
});
