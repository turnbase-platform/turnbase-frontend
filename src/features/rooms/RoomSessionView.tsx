import { Banner } from "@astryxdesign/core/Banner";
import { Link } from "@astryxdesign/core/Link";
import { Text } from "@astryxdesign/core/Text";
import { RoomGame } from "./RoomGame";
import { RoomHeader } from "./RoomHeader";
import { RoomLobby } from "./RoomLobby";
import type { RoomSession } from "./useRoomSession";
import styles from "./RoomSessionView.module.css";

const CLOSED_TEXT = "This room has been closed.";

/** The joined room: the end notice, the reconnect banner, and the game, the lobby or a spinner. */
export function RoomSessionView({ session }: { session: RoomSession }) {
  const { snapshot, connection, connected, ended, game, userId } = session;

  if (ended) {
    return (
      <div className={styles.page}>
        <Banner
          status={ended.kind === "KICKED" ? "warning" : "info"}
          title={ended.kind === "KICKED" ? "The host removed you from this room." : CLOSED_TEXT}
        />
        <Link href="/rooms">Browse active rooms</Link>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {!connected && (
        <Banner
          status="warning"
          title="Connection lost — reconnecting. The room will refresh when it is back."
        />
      )}
      {snapshot && (
        <RoomHeader
          gameId={session.gameId}
          gameName={snapshot.gameName}
          visibility={session.visibility}
          watching={snapshot.spectators.length}
        />
      )}
      {snapshot && connection && game ? (
        <RoomGame
          snapshot={snapshot}
          game={game}
          userId={userId}
          connection={connection}
          gameStalled={session.gameStalled}
          chatMessages={session.chatMessages}
          onLeave={session.leave}
          onReturnToLobby={session.returnToLobby}
        />
      ) : snapshot ? (
        <RoomLobby
          snapshot={snapshot}
          userId={userId}
          connection={connection}
          inviteCode={session.inviteCode}
          visibility={session.visibility}
          minPlayers={session.minPlayers}
          maxPlayers={session.maxPlayers}
          chatMessages={session.chatMessages}
          lastError={session.lastError}
          startStatus={session.startStatus}
          onLeave={session.leave}
          onShareInvite={session.shareInvite}
        />
      ) : (
        <Text>Loading room…</Text>
      )}
    </div>
  );
}
