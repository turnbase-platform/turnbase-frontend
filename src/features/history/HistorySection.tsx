import { HistoryView } from "./HistoryView";
import { useHistory } from "./useHistory";

/** The profile's game history: `useHistory` in its view. */
export function HistorySection({ username }: { username: string }) {
  return <HistoryView history={useHistory(username)} />;
}
