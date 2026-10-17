import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Switch } from "@astryxdesign/core/Switch";
import { Text } from "@astryxdesign/core/Text";
import { Chip, IEye, IRefresh, IUsers, Person } from "../../ui";
import { ChatPanel } from "./ChatPanel";
import { GameStartProgress } from "./GameStartProgress";
import { HostControls } from "./HostControls";
import { LobbyControls } from "./LobbyControls";
import { ParticipantRow } from "./ParticipantRow";
import { RoomLayout } from "./RoomLayout";
import { RoomSection } from "./RoomSection";
import { RoomSettings } from "./RoomSettings";
import { SeatBadges } from "./SeatBadges";
import { unmetStartConditions } from "./roomRules";
import type { RoomConnection } from "./roomSocket";
import { isStartInProgress } from "./startStatus";
import listStyles from "./ParticipantList.module.css";
import styles from "./RoomLobby.module.css";
import type {
  ChatMessageEnvelope,
  GameStartStatus,
  RoomErrorEnvelope,
  RoomResource,
  RoomStateSnapshot,
} from "./rooms-types";

export interface RoomLobbyProps {
  snapshot: RoomStateSnapshot;
  userId: string | null;
  connection: RoomConnection | null;
  /** Present only for the host (`room-rest-api.md` §4) — the invite link is built from it. */
  inviteCode?: string;
  visibility?: RoomResource["visibility"];
  /** From the room resource (`room-rest-api.md` §4) — the snapshot carries neither. */
  minPlayers: number;
  maxPlayers: number;
  chatMessages: ChatMessageEnvelope["payload"][];
  lastError: RoomErrorEnvelope["payload"] | null;
  /** What the last `START_GAME` is doing — shown to every participant. */
  startStatus?: GameStartStatus | null;
  onLeave: () => void;
  onShareInvite: () => void;
}

/** Open seats beyond this are not drawn — a game that takes sixty players needs no sixty rows. */
const MAX_OPEN_SEATS = 6;

function describeError(error: RoomErrorEnvelope["payload"]): string {
  if (error.code === "START_CONDITIONS_NOT_MET") {
    return "The game cannot start yet — not every start condition is met.";
  }
  if (error.code === "GAME_START_FAILED") {
    // The server words this per reason, and says what to do about it.
    return error.message;
  }
  return error.message;
}

function OpenSeat() {
  return (
    <div className={styles.open}>
      <Person name="?" size="sm" />
      <Text color="secondary">Open seat. Waiting for a player…</Text>
    </div>
  );
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
  visibility,
  minPlayers,
  maxPlayers,
  chatMessages,
  lastError,
  startStatus = null,
  onLeave,
  onShareInvite,
}: RoomLobbyProps) {
  const isHost = userId === snapshot.hostId;
  const me = snapshot.players.find((player) => player.playerId === userId);
  const isSpectator = snapshot.spectators.some((spectator) => spectator.playerId === userId);
  const unmet = isHost ? unmetStartConditions(snapshot, minPlayers) : null;
  const seated = snapshot.players.length + snapshot.aiPlayers.length;
  const playerSlotFree = seated < maxPlayers;
  const spectatorSlotFree = snapshot.spectators.length < snapshot.spectatorCapacity;
  const openSeats = Math.min(Math.max(maxPlayers - seated, 0), MAX_OPEN_SEATS);
  const starting = isStartInProgress(startStatus);
  const kick = (playerId: string) => {
    connection?.sendHostCommand("KICK_PLAYER", { playerId });
  };

  return (
    <RoomLayout
      main={
        <>
          {lastError && <Banner status="error" title={describeError(lastError)} />}
          <GameStartProgress status={startStatus} showFailure={!isHost} />
          <LobbyControls
            starting={starting}
            roomId={snapshot.roomId}
            inviteCode={inviteCode}
            unmet={unmet}
            onShareInvite={onShareInvite}
            onStart={() => {
              connection?.sendHostCommand("START_GAME");
            }}
          />

          <RoomSection
            title="Players"
            aside={
              <Chip icon={<IUsers size={14} />}>{`${String(seated)}/${String(maxPlayers)}`}</Chip>
            }
          >
            <ul aria-label="Players" className={listStyles.list}>
              {snapshot.players.map((entry) => (
                <ParticipantRow
                  key={entry.playerId}
                  name={entry.username}
                  you={entry.playerId === userId}
                  badges={<SeatBadges player={entry} isHost={entry.playerId === snapshot.hostId} />}
                  actions={
                    isHost && entry.playerId !== userId ? (
                      <HostControls
                        name={entry.username}
                        onTransfer={() => {
                          connection?.sendHostCommand("TRANSFER_HOST", {
                            newHostId: entry.playerId,
                          });
                        }}
                        onKick={() => {
                          kick(entry.playerId);
                        }}
                      />
                    ) : undefined
                  }
                />
              ))}
            </ul>
            {openSeats > 0 && (
              <div className={listStyles.list}>
                {Array.from({ length: openSeats }, (_, index) => (
                  <OpenSeat key={index} />
                ))}
              </div>
            )}
            {(me && !isHost) || isSpectator ? (
              <div className={styles.footer}>
                {me && !isHost && (
                  <Switch
                    label="I am ready"
                    value={me.ready}
                    onChange={(ready) => {
                      connection?.sendMemberCommand("TOGGLE_READY", { ready });
                    }}
                  />
                )}
                {me && !isHost && snapshot.spectatingEnabled && spectatorSlotFree && (
                  <Button
                    label="Switch to spectator"
                    size="sm"
                    variant="ghost"
                    icon={<IEye size={14} />}
                    onClick={() => {
                      connection?.sendMemberCommand("SWITCH_TO_SPECTATOR");
                    }}
                  />
                )}
                {isSpectator && playerSlotFree && (
                  <Button
                    label="Switch to player"
                    size="sm"
                    variant="ghost"
                    icon={<IRefresh size={14} />}
                    onClick={() => {
                      connection?.sendMemberCommand("SWITCH_TO_PLAYER");
                    }}
                  />
                )}
              </div>
            ) : null}
          </RoomSection>

          {snapshot.spectators.length > 0 && (
            <RoomSection
              title="Spectators"
              aside={<Chip icon={<IEye size={14} />}>{String(snapshot.spectators.length)}</Chip>}
            >
              <ul aria-label="Spectators" className={listStyles.list}>
                {snapshot.spectators.map((entry) => (
                  <ParticipantRow
                    key={entry.playerId}
                    name={entry.username}
                    you={entry.playerId === userId}
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
            </RoomSection>
          )}

          <RoomSettings snapshot={snapshot} visibility={visibility} />

          <div className={styles.actions}>
            <Button label="Leave room" variant="secondary" onClick={onLeave} />
          </div>
        </>
      }
      aside={
        <ChatPanel
          snapshot={snapshot}
          userId={userId}
          messages={chatMessages}
          connection={connection}
        />
      }
    />
  );
}
