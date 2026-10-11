import { useEffect, useState } from "react";
import { fetchStatistics, type Statistics } from "./profileApi";

export type StatisticsState =
  { status: "loading" } | { status: "loaded"; statistics: Statistics } | { status: "error" };

/** FR-STATS-020…025: the profile's statistics, fetched live on each profile load. */
export function useStatistics(username: string) {
  const [state, setState] = useState<StatisticsState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchStatistics(username)
      .then((statistics) => {
        if (!cancelled) setState({ status: "loaded", statistics });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [username, attempt]);

  return {
    state,
    retry: () => {
      setState({ status: "loading" });
      setAttempt((n) => n + 1);
    },
  };
}

export type StatisticsData = ReturnType<typeof useStatistics>;
