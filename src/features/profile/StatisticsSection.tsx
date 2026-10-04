import { useEffect, useState } from "react";
import { Heading } from "@astryxdesign/core/Heading";
import { Link } from "@astryxdesign/core/Link";
import { Stack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { LoadError } from "../../shared/LoadError";
import { fetchStatistics, type Statistics } from "./profileApi";

type LoadState =
  { status: "loading" } | { status: "loaded"; statistics: Statistics } | { status: "error" };

/** The profile's inline statistics: FR-STATS-020…025, fetched live on each profile load. */
export function StatisticsSection({ username }: { username: string }) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
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

  return (
    <Stack gap={2}>
      <Heading level={2}>Statistics</Heading>
      {state.status === "loading" && <Text>Loading…</Text>}
      {state.status === "error" && (
        <LoadError
          message="Could not load statistics."
          onRetry={() => {
            setState({ status: "loading" });
            setAttempt((n) => n + 1);
          }}
        />
      )}
      {state.status === "loaded" && (
        <Stack as="dl" gap={1}>
          <Stack direction="horizontal" gap={2}>
            <dt>Total games played</dt>
            <dd>{state.statistics.totalPlayed}</dd>
          </Stack>
          <Stack direction="horizontal" gap={2}>
            <dt>Most played game</dt>
            {/* FR-STATS-022/023: a link while there is one, a bare placeholder at zero. */}
            <dd>
              {state.statistics.mostPlayedGame ? (
                <Link href={`/games/${state.statistics.mostPlayedGame.gameId}`}>
                  {state.statistics.mostPlayedGame.title}
                </Link>
              ) : (
                "—"
              )}
            </dd>
          </Stack>
        </Stack>
      )}
    </Stack>
  );
}
