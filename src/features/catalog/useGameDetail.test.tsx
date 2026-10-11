import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { ApiError } from "../../shared/api";
import { getGame } from "./catalogApi";
import type { GameDetail } from "./catalog-types";
import { useGameDetail } from "./useGameDetail";

vi.mock("./catalogApi", () => ({ getGame: vi.fn() }));

const GAME = { gameId: "g-1", title: "Chess" } as GameDetail;

beforeEach(() => {
  vi.mocked(getGame).mockReset();
});

describe("useGameDetail", () => {
  it("loads the game by id", async () => {
    vi.mocked(getGame).mockResolvedValue(GAME);
    const { result } = renderHook(() => useGameDetail("g-1"));
    expect(result.current.status).toBe("loading");
    await waitFor(() => {
      expect(result.current).toEqual({ status: "loaded", game: GAME });
    });
    expect(getGame).toHaveBeenCalledWith("g-1");
  });

  it.each([
    [404, "not-found"],
    [410, "gone"],
    [500, "error"],
  ])("FR-GDET-007/008: a %i is %s", async (status, expected) => {
    vi.mocked(getGame).mockRejectedValue(new ApiError(status, {}));
    const { result } = renderHook(() => useGameDetail("g-1"));
    await waitFor(() => {
      expect(result.current.status).toBe(expected);
    });
  });

  it("a network failure is an error", async () => {
    vi.mocked(getGame).mockRejectedValue(new Error("offline"));
    const { result } = renderHook(() => useGameDetail("g-1"));
    await waitFor(() => {
      expect(result.current.status).toBe("error");
    });
  });
});
