import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { GameFrame } from "../game/GameFrame";
import { ChatPanel } from "./ChatPanel";
import { ParticipantPanel } from "./ParticipantPanel";
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

  return (
    <div className={styles.game}>
      <Heading level={1} type="display-2">
        {snapshot.gameName}
      </Heading>
      {over && <Banner status="info" title="The game is over." />}
      {gameStalled && (
        <div className={styles.stalled}>
          <Banner status="error" title="The game could not be loaded — too many requests." />
          <Button
            label="Retry"
            variant="primary"
            onClick={() => {
              connection.retryAttach();
            }}
          />
        </div>
      )}
      <div className={styles.layout}>
        <div className={styles.stage}>
          <GameFrame
            gameFrontendUrl={game.gameFrontendUrl}
            sessionId={game.sessionId}
            teamId={me?.teamId ?? null}
            connection={connection}
          />
        </div>
        <aside className={styles.aside}>
          <ParticipantPanel snapshot={snapshot} userId={userId} connection={connection} />
          <ChatPanel
            snapshot={snapshot}
            userId={userId}
            messages={chatMessages}
            connection={connection}
          />
        </aside>
      </div>
      <div className={styles.actions}>
        {over && <Button label="Return to lobby" variant="primary" onClick={onReturnToLobby} />}
        <Button label="Leave room" variant="secondary" onClick={onLeave} />
      </div>
    </div>
  );
}
