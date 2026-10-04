import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { Stack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { unmetStartConditions } from "./roomRules";
import type { RoomConnection } from "./roomSocket";
import { ChatPanel } from "./ChatPanel";
import { InviteFriendsButton } from "./InviteFriendsButton";
import type { ChatMessageEnvelope, RoomErrorEnvelope, RoomStateSnapshot } from "./rooms-types";

export interface RoomLobbyProps {
  snapshot: RoomStateSnapshot;
  userId: string | null;
  connection: RoomConnection | null;
  /** Present only for the host (`room-rest-api.md` §4) — the invite link is built from it. */
  inviteCode?: string;
  /** From the room resource (`room-rest-api.md` §4) — the snapshot carries neither. */
  minPlayers: number;
  maxPlayers: number;
  chatMessages: ChatMessageEnvelope["payload"][];
  lastError: RoomErrorEnvelope["payload"] | null;
  onLeave: () => void;
  onShareInvite: () => void;
}

function describeError(error: RoomErrorEnvelope["payload"]): string {
  if (error.code === "START_CONDITIONS_NOT_MET") {
    return "The game cannot start yet — not every start condition is met.";
  }
  if (error.code === "GAME_START_FAILED") {
    return "The game could not be started. Please try again.";
  }
  return error.message;
}

/**
 * VW-RLOBBY-001…006, 009, 011…014. Everything shown is read off the `ROOM_STATE`-derived
 * snapshot; every action is a command whose outcome returns as an event. Start is disabled, with
 * the reasons listed, until the conditions above hold (FR-TEAM-009); a Switch is offered only while
 * the target role has a free slot (VW-RLOBBY-012, 013).
 */
export function RoomLobby({
  snapshot,
  userId,
  connection,
  inviteCode,
  minPlayers,
  maxPlayers,
  chatMessages,
  lastError,
  onLeave,
  onShareInvite,
}: RoomLobbyProps) {
  const isHost = userId === snapshot.hostId;
  const me = snapshot.players.find((player) => player.playerId === userId);
  const isSpectator = snapshot.spectators.some((spectator) => spectator.playerId === userId);
  const parameters = Object.entries(snapshot.parameters);
  const unmet = isHost ? unmetStartConditions(snapshot, minPlayers) : [];
  const playerSlotFree = snapshot.players.length + snapshot.aiPlayers.length < maxPlayers;
  const spectatorSlotFree = snapshot.spectators.length < snapshot.spectatorCapacity;

  return (
    <Stack gap={4}>
      <Heading level={1}>{snapshot.gameName}</Heading>
      {lastError && <Banner status="error" title={describeError(lastError)} />}

      <Stack gap={2}>
        <Heading level={2}>Players</Heading>
        <ul aria-label="Players">
          {snapshot.players.map((entry) => (
            <li key={entry.playerId}>
              <Stack direction="horizontal" gap={2} wrap="wrap">
                <Text>{entry.username}</Text>
                {entry.playerId === snapshot.hostId && <Badge label="Host" variant="info" />}
                {entry.playerId !== snapshot.hostId && (
                  <Badge
                    label={entry.ready ? "Ready" : "Not ready"}
                    variant={entry.ready ? "success" : "neutral"}
                  />
                )}
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
                        connection?.sendHostCommand("KICK_PLAYER", { playerId: entry.playerId });
                      }}
                    />
                  </>
                )}
              </Stack>
            </li>
          ))}
        </ul>
      </Stack>

      {snapshot.spectators.length > 0 && (
        <Stack gap={2}>
          <Heading level={2}>Spectators</Heading>
          <ul aria-label="Spectators">
            {snapshot.spectators.map((entry) => (
              <li key={entry.playerId}>
                <Stack direction="horizontal" gap={2} wrap="wrap">
                  <Text>{entry.username}</Text>
                  {isHost && (
                    <Button
                      label="Kick"
                      variant="secondary"
                      aria-label={`Kick ${entry.username}`}
                      onClick={() => {
                        connection?.sendHostCommand("KICK_PLAYER", { playerId: entry.playerId });
                      }}
                    />
                  )}
                </Stack>
              </li>
            ))}
          </ul>
        </Stack>
      )}

      <Stack gap={2}>
        <Heading level={2}>Game parameters</Heading>
        {parameters.length === 0 ? (
          <Text>This game has no parameters.</Text>
        ) : (
          <dl aria-label="Game parameters">
            {parameters.map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{typeof value === "string" ? value : JSON.stringify(value)}</dd>
              </div>
            ))}
          </dl>
        )}
      </Stack>

      <ChatPanel
        snapshot={snapshot}
        userId={userId}
        messages={chatMessages}
        connection={connection}
      />

      {unmet.length > 0 && (
        <ul aria-label="Why the game cannot start yet">
          {unmet.map((reason) => (
            <li key={reason}>
              <Text>{reason}</Text>
            </li>
          ))}
        </ul>
      )}

      <Stack direction="horizontal" gap={2} wrap="wrap">
        {me && !isHost && (
          <Button
            label={me.ready ? "Not ready" : "Ready"}
            variant="primary"
            onClick={() => {
              connection?.sendMemberCommand("TOGGLE_READY", { ready: !me.ready });
            }}
          />
        )}
        {isHost && (
          <Button
            label="Start game"
            variant="primary"
            isDisabled={unmet.length > 0}
            onClick={() => {
              connection?.sendHostCommand("START_GAME");
            }}
          />
        )}
        {isHost && <InviteFriendsButton roomId={snapshot.roomId} />}
        {isHost && inviteCode && (
          <Button label="Share invite link" variant="secondary" onClick={onShareInvite} />
        )}
        {me && !isHost && snapshot.spectatingEnabled && spectatorSlotFree && (
          <Button
            label="Switch to spectator"
            variant="secondary"
            onClick={() => {
              connection?.sendMemberCommand("SWITCH_TO_SPECTATOR");
            }}
          />
        )}
        {isSpectator && playerSlotFree && (
          <Button
            label="Switch to player"
            variant="secondary"
            onClick={() => {
              connection?.sendMemberCommand("SWITCH_TO_PLAYER");
            }}
          />
        )}
        <Button label="Leave room" variant="secondary" onClick={onLeave} />
      </Stack>
    </Stack>
  );
}
