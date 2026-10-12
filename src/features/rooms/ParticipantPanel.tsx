import { Badge } from "@astryxdesign/core/Badge";
import { HostControls } from "./HostControls";
import { ParticipantRow } from "./ParticipantRow";
import { SeatBadges } from "./SeatBadges";
import type { RoomConnection } from "./roomSocket";
import type { RoomStateSnapshot } from "./rooms-types";
import styles from "./ParticipantPanel.module.css";

export interface ParticipantPanelProps {
  snapshot: RoomStateSnapshot;
  userId: string | null;
  connection: RoomConnection | null;
}

/**
 * VW-RGAME-002, 004, 005 and VW-RRESULT-004, 005 — who is in the room while a game runs or has just
 * ended, as a row of seats under the game. Connection state is shown because a dropped player
 * holds a reserved slot for the grace period (`reconnection-flow.md`); host controls are
 * commands, their outcome returns as an event.
 */
export function ParticipantPanel({ snapshot, userId, connection }: ParticipantPanelProps) {
  const isHost = userId === snapshot.hostId;
  const kick = (playerId: string) => {
    connection?.sendHostCommand("KICK_PLAYER", { playerId });
  };

  return (
    <ul aria-label="Participants" className={styles.seats}>
      {snapshot.players.map((entry) => (
        <ParticipantRow
          key={entry.playerId}
          name={entry.username}
          you={entry.playerId === userId}
          badges={
            <SeatBadges
              player={entry}
              isHost={entry.playerId === snapshot.hostId}
              showReady={false}
            />
          }
          actions={
            isHost && entry.playerId !== userId ? (
              <HostControls
                name={entry.username}
                onTransfer={() => {
                  connection?.sendHostCommand("TRANSFER_HOST", { newHostId: entry.playerId });
                }}
                onKick={() => {
                  kick(entry.playerId);
                }}
              />
            ) : undefined
          }
        />
      ))}
      {snapshot.spectators.map((entry) => (
        <ParticipantRow
          key={entry.playerId}
          name={entry.username}
          you={entry.playerId === userId}
          badges={<Badge label="Spectator" variant="neutral" />}
          actions={
            isHost ? (
              <HostControls
                name={entry.username}
                onKick={() => {
                  kick(entry.playerId);
                }}
              />
            ) : undefined
          }
        />
      ))}
    </ul>
  );
}
