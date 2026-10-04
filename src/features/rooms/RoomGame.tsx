import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { Stack } from "@astryxdesign/core/Stack";
import { GameFrame } from "../game/GameFrame";
import { ChatPanel } from "./ChatPanel";
import { ParticipantPanel } from "./ParticipantPanel";
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
    <Stack gap={4}>
      <Heading level={1}>{snapshot.gameName}</Heading>
      {over && <Banner status="info" title="The game is over." />}
      {gameStalled && (
        <Stack direction="horizontal" gap={2} align="center" wrap="wrap">
          <Banner status="error" title="The game could not be loaded — too many requests." />
          <Button
            label="Retry"
            variant="primary"
            onClick={() => {
              connection.retryAttach();
            }}
          />
        </Stack>
      )}
      <GameFrame
        gameFrontendUrl={game.gameFrontendUrl}
        sessionId={game.sessionId}
        teamId={me?.teamId ?? null}
        connection={connection}
      />
      <ParticipantPanel snapshot={snapshot} userId={userId} connection={connection} />
      <ChatPanel
        snapshot={snapshot}
        userId={userId}
        messages={chatMessages}
        connection={connection}
      />
      <Stack direction="horizontal" gap={2} wrap="wrap">
        {over && <Button label="Return to lobby" variant="primary" onClick={onReturnToLobby} />}
        <Button label="Leave room" variant="secondary" onClick={onLeave} />
      </Stack>
    </Stack>
  );
}
