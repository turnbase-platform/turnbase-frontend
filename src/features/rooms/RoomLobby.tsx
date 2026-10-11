import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { unmetStartConditions } from "./roomRules";
import type { RoomConnection } from "./roomSocket";
import { ChatPanel } from "./ChatPanel";
import { InviteFriendsButton } from "./InviteFriendsButton";
import { ParticipantRow } from "./ParticipantRow";
import { RoomSection } from "./RoomSection";
import listStyles from "./ParticipantList.module.css";
import styles from "./RoomLobby.module.css";
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
    <div className={styles.lobby}>
      <Heading level={1} type="display-2">
        {snapshot.gameName}
      </Heading>
      {lastError && <Banner status="error" title={describeError(lastError)} />}

      <div className={styles.grid}>
        <RoomSection title="Players">
          <ul aria-label="Players" className={listStyles.list}>
            {snapshot.players.map((entry) => (
              <ParticipantRow
                key={entry.playerId}
                name={entry.username}
                badges={
                  <>
                    {entry.playerId === snapshot.hostId ? (
                      <Badge label="Host" variant="info" />
                    ) : (
                      <Badge
                        label={entry.ready ? "Ready" : "Not ready"}
                        variant={entry.ready ? "success" : "neutral"}
                      />
                    )}
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
                          connection?.sendHostCommand("TRANSFER_HOST", {
                            newHostId: entry.playerId,
                          });
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
                  ) : undefined
                }
              />
            ))}
          </ul>
        </RoomSection>

        {snapshot.spectators.length > 0 && (
          <RoomSection title="Spectators">
            <ul aria-label="Spectators" className={listStyles.list}>
              {snapshot.spectators.map((entry) => (
                <ParticipantRow
                  key={entry.playerId}
                  name={entry.username}
                  actions={
                    isHost ? (
                      <Button
                        label="Kick"
                        variant="secondary"
                        aria-label={`Kick ${entry.username}`}
                        onClick={() => {
                          connection?.sendHostCommand("KICK_PLAYER", { playerId: entry.playerId });
                        }}
                      />
                    ) : undefined
                  }
                />
              ))}
            </ul>
          </RoomSection>
        )}

        <RoomSection title="Game parameters">
          {parameters.length === 0 ? (
            <Text>This game has no parameters.</Text>
          ) : (
            <dl aria-label="Game parameters" className={styles.parameters}>
              {parameters.map(([key, value]) => (
                <div key={key} className={styles.parameter}>
                  <dt>
                    <Text color="secondary">{key}</Text>
                  </dt>
                  <dd>
                    <Text>{typeof value === "string" ? value : JSON.stringify(value)}</Text>
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </RoomSection>
      </div>

      <ChatPanel
        snapshot={snapshot}
        userId={userId}
        messages={chatMessages}
        connection={connection}
      />

      {unmet.length > 0 && (
        <ul aria-label="Why the game cannot start yet" className={styles.unmet}>
          {unmet.map((reason) => (
            <li key={reason}>
              <Text color="secondary">{reason}</Text>
            </li>
          ))}
        </ul>
      )}

      <div className={styles.actions}>
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
      </div>
    </div>
  );
}
