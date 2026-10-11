import { useEffect, useMemo, useRef, useState } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import type { RoomConnection } from "../rooms/roomSocket";
import { trustedGameOrigin } from "./gameOrigin";
import { parseGameOutbound, type GameInbound } from "./gameMessages";
import { GameRelay, type GameLogEntry } from "./gameRelay";
import styles from "./GameFrame.module.css";

/** A game that never sends `ready` gets a visible timeout, not a blank frame (`shell-architecture.md` §5). */
export const READY_TIMEOUT_MS = 15_000;

/** Normative value owned by `game-asset-serving.md` §6.1 — identical for every game, no trust branch. */
export const GAME_SANDBOX = "allow-scripts allow-same-origin";

export interface GameFrameProps {
  /** The server-supplied absolute URL (`GAME_STARTED` / `ROOM_STATE`) — never assembled here. */
  gameFrontendUrl: string;
  sessionId: string;
  teamId: string | null;
  connection: RoomConnection;
  onLog?: (entries: GameLogEntry[]) => void;
}

/**
 * VW-RGAME-001. The only component that speaks `postMessage` (`websocket.md` § *Platform-shell
 * relay contract*). It shares no state with the game frontend: no `contentWindow` access other than
 * as the `postMessage` target and the source identity to compare against.
 */
export function GameFrame({
  gameFrontendUrl,
  sessionId,
  teamId,
  connection,
  onLog,
}: GameFrameProps) {
  const gameOrigin = useMemo(() => trustedGameOrigin(gameFrontendUrl), [gameFrontendUrl]);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const onLogRef = useRef(onLog);
  useEffect(() => {
    onLogRef.current = onLog;
  });

  useEffect(() => {
    if (!gameOrigin) return;
    let isReady = false;
    const relay = new GameRelay(sessionId, {
      post: (message: GameInbound) => {
        // Always the exact game origin, never '*': if the frame navigates itself elsewhere the
        // post is simply not delivered (`game-asset-serving.md` §6.2).
        frameRef.current?.contentWindow?.postMessage(message, gameOrigin);
      },
      onLog: (entries) => onLogRef.current?.(entries),
      onSessionFailed: (payload) => {
        setFailure(payload.message);
      },
    });

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== gameOrigin) return; // 1 — exact equality, never startsWith
      if (event.source !== frameRef.current?.contentWindow) return; // 2
      const message = parseGameOutbound(event.data); // 3
      if (!message) return;
      if (message.type === "ready") {
        isReady = true;
        setTimedOut(false);
        relay.markReady();
      } else {
        // No identity is added: the acting player is the server's determination (FR-FA-002).
        connection.submitGameAction(message.payload);
      }
    };
    window.addEventListener("message", onMessage);
    const detach = connection.attachGame(sessionId, teamId, (raw) => {
      relay.receive(raw);
    });
    const timer = setTimeout(() => {
      if (!isReady) setTimedOut(true);
    }, READY_TIMEOUT_MS);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      detach();
    };
  }, [gameOrigin, sessionId, teamId, connection]);

  if (!gameOrigin) {
    return <Banner status="error" title="This game could not be loaded." />;
  }

  return (
    <div className={styles.frame}>
      {failure !== null && <Banner status="error" title={failure} />}
      {timedOut && <Banner status="warning" title="The game is taking too long to start." />}
      <iframe
        ref={frameRef}
        title="Game"
        src={gameFrontendUrl}
        sandbox={GAME_SANDBOX}
        allow=""
        referrerPolicy="no-referrer"
        className={styles.iframe}
      />
    </div>
  );
}
