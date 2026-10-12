import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Text } from "@astryxdesign/core/Text";
import { Chip, IPlay, IRefresh } from "../../ui";
import { GameFrame } from "../game/GameFrame";
import { ChatPanel } from "./ChatPanel";
import { ParticipantPanel } from "./ParticipantPanel";
import { RoomLayout } from "./RoomLayout";
import styles from "./RoomGame.module.css";
import type { RoomConnection } from "./roomSocket";
import type { ChatMessageEnvelope, RoomStateSnapshot } from "./rooms-types";

export interface RoomGameProps {
  snapshot: RoomStateSnapshot;
  /** The session being shown — kept after `GAME_ENDED` so the iframe can display results. */
  game: { sessionId: string; gameFrontendUrl: string };
  userId: string | null;
  connection: RoomConnection;
  /** The game stream never arrived because the rate limiter kept dropping the attach. */
  gameStalled?: boolean;
  chatMessages: ChatMessageEnvelope["payload"][];
  onLeave: () => void;
  onReturnToLobby: () => void;
}

/**
 * VW-RGAME-001…005 while the room is `IN_PROGRESS`; VW-RRESULT-001…005 once it is back in `LOBBY`
 * with the game still shown. It is one tree in both states, so the iframe — and the game's own
 * results screen — is never remounted by `GAME_ENDED`; Return to Lobby is what dismisses it.
 */
export function RoomGame({
  snapshot,
  game,
  userId,
  connection,
  gameStalled = false,
  chatMessages,
  onLeave,
  onReturnToLobby,
}: RoomGameProps) {
  const over = snapshot.state === "LOBBY";
  const me = snapshot.players.find((player) => player.playerId === userId);
  const seated = snapshot.players.length + snapshot.aiPlayers.length;

  return (
    <RoomLayout
      main={
        <>
          {gameStalled && (
            <div className={styles.stalled}>
              <Banner status="error" title="The game could not be loaded — too many requests." />
              <Button
                label="Retry"
                variant="primary"
                icon={<IRefresh />}
                onClick={() => {
                  connection.retryAttach();
                }}
              />
            </div>
          )}
          <div className={`${styles.frame} tb-glass`}>
            <div className={styles.bar}>
              <Chip tone={over ? "neutral" : "live"}>{over ? "Match over" : "In progress"}</Chip>
              {over ? (
                <div className={styles.over}>
                  <Text type="supporting" color="secondary">
                    The game is over.
                  </Text>
                  <Button
                    label="Return to lobby"
                    variant="primary"
                    size="sm"
                    icon={<IPlay size={14} />}
                    onClick={onReturnToLobby}
                  />
                </div>
              ) : (
                <Text type="supporting" color="secondary">
                  {`${String(seated)} playing`}
                </Text>
              )}
            </div>
            <div className={styles.stage}>
              <GameFrame
                gameFrontendUrl={game.gameFrontendUrl}
                sessionId={game.sessionId}
                teamId={me?.teamId ?? null}
                connection={connection}
              />
            </div>
          </div>
          <ParticipantPanel snapshot={snapshot} userId={userId} connection={connection} />
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
          compact
        />
      }
    />
  );
}
