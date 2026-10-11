import { Link } from "@astryxdesign/core/Link";
import { Text } from "@astryxdesign/core/Text";
import { SectionCard } from "../../ui";
import { LoadError } from "../../shared/LoadError";
import type { StatisticsData } from "./useStatistics";
import styles from "./StatisticsView.module.css";

/** The profile's statistics (FR-STATS-020…025): the figures as large readouts. */
export function StatisticsView({ statistics }: { statistics: StatisticsData }) {
  const { state } = statistics;
  return (
    <SectionCard title="Statistics">
      {state.status === "loading" && <Text>Loading…</Text>}
      {state.status === "error" && (
        <LoadError message="Could not load statistics." onRetry={statistics.retry} />
      )}
      {state.status === "loaded" && (
        <dl className={styles.figures}>
          <div className={styles.figure}>
            <dt>
              <Text color="secondary">Total games played</Text>
            </dt>
            <dd className={styles.value}>{state.statistics.totalPlayed}</dd>
          </div>
          <div className={styles.figure}>
            <dt>
              <Text color="secondary">Most played game</Text>
            </dt>
            {/* FR-STATS-022/023: a link while there is one, a bare placeholder at zero. */}
            <dd className={styles.value}>
              {state.statistics.mostPlayedGame ? (
                <Link href={`/games/${state.statistics.mostPlayedGame.gameId}`}>
                  {state.statistics.mostPlayedGame.title}
                </Link>
              ) : (
                "—"
              )}
            </dd>
          </div>
        </dl>
      )}
    </SectionCard>
  );
}
