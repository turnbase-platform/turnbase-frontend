import { StatisticsView } from "./StatisticsView";
import { useStatistics } from "./useStatistics";

/** The profile's inline statistics: `useStatistics` in its view. */
export function StatisticsSection({ username }: { username: string }) {
  return <StatisticsView statistics={useStatistics(username)} />;
}
