import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { Chip, GameCover, IEye, IPlay, IUsers } from "../../ui";
import type { RoomListRow } from "./rooms-types";
import styles from "./RoomRow.module.css";

/**
 * VW-ROOMS-001: one active room as a row. The list carries no room name, so the game is the title.
 * The actions are exactly the ones the server's flags allow (FR-LIST-003a), and each names its row
 * for a screen reader because a page holds many of them.
 */
export function RoomRow({
  row,
  index = 0,
  joining,
  onJoin,
}: {
  row: RoomListRow;
  index?: number;
  joining: boolean;
  onJoin: (row: RoomListRow, role: "PLAYER" | "SPECTATOR") => void;
}) {
  const which = `${row.gameName} hosted by ${row.hostUsername}`;
  const lobby = row.state === "LOBBY";
  return (
    <li className={styles.cell} style={{ "--i": index } as React.CSSProperties}>
      <Card padding={0}>
        <div className={styles.row}>
          <GameCover gameId={row.gameId} className={styles.thumb} />
          <div className={styles.text}>
            <div className={styles.titleRow}>
              <Heading level={2}>{row.gameName}</Heading>
              <Badge
                variant={lobby ? "success" : "warning"}
                label={lobby ? "Lobby" : "In progress"}
              />
            </div>
            <div className={styles.meta}>
              <Text type="supporting" color="secondary">
                Host {row.hostUsername}
              </Text>
              <Chip icon={<IUsers size={14} />}>
                {`${String(row.playerCount)} / ${String(row.playerCapacity)}`}
              </Chip>
              {row.spectatingSupported && row.spectatorCount > 0 && (
                <Chip icon={<IEye size={14} />}>{String(row.spectatorCount)}</Chip>
              )}
            </div>
          </div>
          <div className={styles.actions}>
            {row.canJoin && (
              <Button
                label="Join"
                variant="primary"
                icon={<IPlay />}
                aria-label={`Join ${which}`}
                isLoading={joining}
                onClick={() => {
                  onJoin(row, "PLAYER");
                }}
              />
            )}
            {row.canSpectate && (
              <Button
                label="Spectate"
                variant="secondary"
                icon={<IEye />}
                aria-label={`Spectate ${which}`}
                isLoading={joining}
                onClick={() => {
                  onJoin(row, "SPECTATOR");
                }}
              />
            )}
          </div>
        </div>
      </Card>
    </li>
  );
}
