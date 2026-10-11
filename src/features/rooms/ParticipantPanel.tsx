import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { ParticipantRow } from "./ParticipantRow";
import { RoomSection } from "./RoomSection";
import type { RoomConnection } from "./roomSocket";
import type { RoomStateSnapshot } from "./rooms-types";
import styles from "./ParticipantList.module.css";

export interface ParticipantPanelProps {
  snapshot: RoomStateSnapshot;
  userId: string | null;
  connection: RoomConnection | null;
}

/**
 * VW-RGAME-002, 004, 005 and VW-RRESULT-004, 005 — who is in the room while a game runs or has just
 * ended. Connection state is shown because a dropped player holds a reserved slot for the grace
 * period (`reconnection-flow.md`); host controls are commands, their outcome returns as an event.
 */
export function ParticipantPanel({ snapshot, userId, connection }: ParticipantPanelProps) {
  const isHost = userId === snapshot.hostId;
  const kick = (playerId: string) => {
    connection?.sendHostCommand("KICK_PLAYER", { playerId });
  };

  return (
    <RoomSection title="Participants">
      <ul aria-label="Participants" className={styles.list}>
        {snapshot.players.map((entry) => (
          <ParticipantRow
            key={entry.playerId}
            name={entry.username}
            badges={
              <>
                {entry.playerId === snapshot.hostId && <Badge label="Host" variant="info" />}
                {!entry.connected && <Badge label="Disconnected" variant="warning" />}
              </>
            }
            actions={
              isHost && entry.playerId !== userId ? (
                <>
                  <Button
                    label="Transfer host"
                    variant="secondary"
                    aria-label={`Transfer host to ${entry.username}`}
                    onClick={() => {
                      connection?.sendHostCommand("TRANSFER_HOST", { newHostId: entry.playerId });
                    }}
                  />
                  <Button
                    label="Kick"
                    variant="secondary"
                    aria-label={`Kick ${entry.username}`}
                    onClick={() => {
                      kick(entry.playerId);
                    }}
                  />
                </>
              ) : undefined
            }
          />
        ))}
        {snapshot.spectators.map((entry) => (
          <ParticipantRow
            key={entry.playerId}
            name={entry.username}
            badges={<Badge label="Spectator" variant="neutral" />}
            actions={
              isHost ? (
                <Button
                  label="Kick"
                  variant="secondary"
                  aria-label={`Kick ${entry.username}`}
                  onClick={() => {
                    kick(entry.playerId);
                  }}
                />
              ) : undefined
            }
          />
        ))}
      </ul>
    </RoomSection>
  );
}
