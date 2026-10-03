import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { Stack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import type { RoomConnection } from "./roomSocket";
import type { RoomStateSnapshot } from "./rooms-types";

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
    <Stack gap={2}>
      <Heading level={2}>Participants</Heading>
      <ul aria-label="Participants">
        {snapshot.players.map((entry) => (
          <li key={entry.playerId}>
            <Stack direction="horizontal" gap={2} wrap="wrap">
              <Text>{entry.username}</Text>
              {entry.playerId === snapshot.hostId && <Badge label="Host" variant="info" />}
              {!entry.connected && <Badge label="Disconnected" variant="warning" />}
              {isHost && entry.playerId !== userId && (
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
              )}
            </Stack>
          </li>
        ))}
        {snapshot.spectators.map((entry) => (
          <li key={entry.playerId}>
            <Stack direction="horizontal" gap={2} wrap="wrap">
              <Text>{entry.username}</Text>
              <Badge label="Spectator" variant="neutral" />
              {isHost && (
                <Button
                  label="Kick"
                  variant="secondary"
                  aria-label={`Kick ${entry.username}`}
                  onClick={() => {
                    kick(entry.playerId);
                  }}
                />
              )}
            </Stack>
          </li>
        ))}
      </ul>
    </Stack>
  );
}
