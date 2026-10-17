import { Banner } from "@astryxdesign/core/Banner";
import { Card } from "@astryxdesign/core/Card";
import { Spinner } from "@astryxdesign/core/Spinner";
import { Text } from "@astryxdesign/core/Text";
import type { GameStartStatus } from "./rooms-types";
import { describeStartFailure, START_PHASE_TEXT } from "./startStatus";
import styles from "./GameStartProgress.module.css";

/**
 * What `START_GAME` is doing, shown to everyone in the lobby (`GAME_START_STATUS`). A failure is
 * shown to the host by the unicast `GAME_START_FAILED` banner, which carries the same reason, so
 * `showFailure` is for everyone else.
 */
export function GameStartProgress({
  status,
  showFailure,
}: {
  status: GameStartStatus | null;
  showFailure: boolean;
}) {
  if (!status) return null;
  if (status.phase === "FAILED") {
    return showFailure ? (
      <Banner status="error" title={describeStartFailure(status.reason)} />
    ) : null;
  }
  return (
    <Card padding={5} elevation="med">
      <div className={styles.row} aria-live="polite">
        <Spinner size="lg" aria-label="Starting the game" />
        <Text>{START_PHASE_TEXT[status.phase]}</Text>
      </div>
    </Card>
  );
}
