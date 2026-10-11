import { useEffect, useState } from "react";
import { ApiError } from "../../shared/api";
import { getGame } from "./catalogApi";
import type { GameDetail } from "./catalog-types";

export type GameDetailState =
  | { status: "loading" }
  | { status: "loaded"; game: GameDetail }
  | { status: "not-found" } // FR-GDET-008: invisible and nonexistent are indistinguishable
  | { status: "gone" } // FR-GDET-007
  | { status: "error" };

/** VW-GDET-001…003: loads one game once with the page (FR-GDET-005: never pushed). */
export function useGameDetail(gameId: string): GameDetailState {
  const [state, setState] = useState<GameDetailState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    getGame(gameId)
      .then((game) => {
        if (!cancelled) setState({ status: "loaded", game });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 404) setState({ status: "not-found" });
        else if (error instanceof ApiError && error.status === 410) setState({ status: "gone" });
        else setState({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [gameId]);

  return state;
}
