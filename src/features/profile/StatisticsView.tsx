import { Card } from "@astryxdesign/core/Card";
import { Link } from "@astryxdesign/core/Link";
import { Text } from "@astryxdesign/core/Text";
import { LoadError } from "../../shared/LoadError";
import type { StatisticsData } from "./useStatistics";
import styles from "./StatisticsView.module.css";

/**
 * The profile's Stats tab (FR-STATS-020…025): the figures the platform keeps, as big-number cards.
 * It keeps no win rate, streak or per-game split, so there are none to draw (ADR-0017 §5).
 */
export function StatisticsView({ statistics }: { statistics: StatisticsData }) {
  const { state } = statistics;
  if (state.status === "loading") return <Text>Loading…</Text>;
  if (state.status === "error") {
    return <LoadError message="Could not load statistics." onRetry={statistics.retry} />;
  }
  return (
    <div className={styles.figures}>
      <Card padding={5}>
        <dl className={styles.figure}>
          <dt>
            <Text color="secondary">Total games played</Text>
          </dt>
          <dd className={styles.value}>{state.statistics.totalPlayed}</dd>
        </dl>
      </Card>
      <Card padding={5}>
        <dl className={styles.figure}>
          <dt>
            <Text color="secondary">Most played game</Text>
          </dt>
          {/* FR-STATS-022/023: a link while there is one, a bare placeholder at zero. */}
          <dd className={styles.value}>
            {state.statistics.mostPlayedGame ? (
              <Link href={`/games/${state.statistics.mostPlayedGame.gameId}`} color="inherit">
                {state.statistics.mostPlayedGame.title}
              </Link>
            ) : (
              "—"
            )}
          </dd>
        </dl>
      </Card>
    </div>
  );
}
