import { useState } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { useImmersive } from "../../shared/useImmersive";
import { IRefresh } from "../../ui";
import { GameFrame } from "../game/GameFrame";
import { FloatingChat } from "./FloatingChat";
import { RoomDock } from "./RoomDock";
import { RoomPanel } from "./RoomPanel";
import styles from "./RoomGame.module.css";
import type { RoomConnection } from "./roomSocket";
import type { ChatMessageEnvelope, RoomResource, RoomStateSnapshot } from "./rooms-types";
import { useChat } from "./useChat";

export interface RoomGameProps {
  snapshot: RoomStateSnapshot;
  /** The session being shown — kept after `GAME_ENDED` so the iframe can display results. */
  game: { sessionId: string; gameFrontendUrl: string };
  userId: string | null;
  connection: RoomConnection;
  visibility?: RoomResource["visibility"];
  /** The room socket is up; while it is not, the dock says so. */
  connected?: boolean;
  /** The game stream never arrived because the rate limiter kept dropping the attach. */
  gameStalled?: boolean;
  chatMessages: ChatMessageEnvelope["payload"][];
  onLeave: () => void;
  onReturnToLobby: () => void;
}

/**
 * VW-RGAME-001, 009…016 while the room is `IN_PROGRESS`; VW-RRESULT-001…005 once it is back in
 * `LOBBY` with the game still shown (`immersive-room.md`). The game fills the window and the
 * shell's chrome is removed; the room dock and, if the player has undocked it, the floating chat
 * are all that sit over it. It is one tree in both states, so the iframe — and the game's own
 * results screen — is never remounted by `GAME_ENDED`; Return to lobby is what dismisses it.
 */
export function RoomGame({
  snapshot,
  game,
  userId,
  connection,
  visibility,
  connected = true,
  gameStalled = false,
  chatMessages,
  onLeave,
  onReturnToLobby,
}: RoomGameProps) {
  useImmersive();
  // Held here, above the panel and the window, so a draft and the channel survive a dock or undock.
  const chat = useChat(snapshot, userId, chatMessages, connection);
  const [floating, setFloating] = useState(false);
  const me = snapshot.players.find((player) => player.playerId === userId);

  return (
    <>
      <GameFrame
        fill
        gameFrontendUrl={game.gameFrontendUrl}
        sessionId={game.sessionId}
        teamId={me?.teamId ?? null}
        connection={connection}
      />
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
      {floating && chat.available && (
        <FloatingChat
          chat={chat}
          onDock={() => {
            setFloating(false);
          }}
        />
      )}
      <RoomDock warning={!connected}>
        <RoomPanel
          snapshot={snapshot}
          userId={userId}
          connection={connection}
          visibility={visibility}
          connected={connected}
          chat={chat}
          chatFloating={floating}
          onUndockChat={() => {
            setFloating(true);
          }}
          onLeave={onLeave}
          onReturnToLobby={onReturnToLobby}
        />
      </RoomDock>
    </>
  );
}
