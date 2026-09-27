import { useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/auth-context";
import { applyRoomEvent } from "./roomReducer";
import { openRoomConnection, type RoomConnection, type RoomMembership } from "./roomSocket";
import type { ChatMessageEnvelope, RoomErrorEnvelope, RoomStateSnapshot } from "./rooms-types";

export interface RoomConnectionState {
  snapshot: RoomStateSnapshot | null;
  connected: boolean;
  chatMessages: ChatMessageEnvelope["payload"][];
  lastError: RoomErrorEnvelope["payload"] | null;
  connection: RoomConnection | null;
}

/** Enough to render recent chat history for the session; chat is never persisted server-side
 * (`room-chat-websocket.md` § No History), so there is nothing to grow this toward. */
const CHAT_HISTORY_LIMIT = 200;

function membershipOf(snapshot: RoomStateSnapshot, userId: string | null): RoomMembership {
  const player = snapshot.players.find((candidate) => candidate.playerId === userId);
  return player ? { isPlayer: true, teamId: player.teamId } : { isPlayer: false, teamId: null };
}

/**
 * Owns the room's one STOMP connection for the life of the component that mounts it —
 * `shell-architecture.md` §4/§8. `instanceHint` is the freshest `X-TurnBase-Room-Instance` value
 * available (from the join/create/get response that led here); changing it reopens the socket.
 */
export function useRoomConnection(
  roomId: string,
  instanceHint: string | null,
): RoomConnectionState {
  const { principal } = useAuth();
  const userId = principal?.userId ?? null;
  const [renderedRoomId, setRenderedRoomId] = useState(roomId);
  const [snapshot, setSnapshot] = useState<RoomStateSnapshot | null>(null);
  const [connected, setConnected] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessageEnvelope["payload"][]>([]);
  const [lastError, setLastError] = useState<RoomErrorEnvelope["payload"] | null>(null);
  const [connection, setConnection] = useState<RoomConnection | null>(null);
  const seenMessageIds = useRef(new Set<string>());

  // Adjusting state during render (not in the effect below) on a room change — the React-
  // recommended way to reset state derived purely from a prop, without an extra render's flash
  // of the previous room's snapshot (react.dev "You Might Not Need an Effect").
  if (roomId !== renderedRoomId) {
    setRenderedRoomId(roomId);
    setSnapshot(null);
    setConnected(false);
    setChatMessages([]);
    setLastError(null);
  }

  useEffect(() => {
    seenMessageIds.current = new Set();
    const conn = openRoomConnection(
      roomId,
      instanceHint,
      { isPlayer: false, teamId: null },
      {
        onSnapshot: (snap) => {
          setSnapshot(snap);
          conn.setMembership(membershipOf(snap, userId));
        },
        onEvent: (event) => {
          setSnapshot((current) => {
            if (!current) return current;
            const next = applyRoomEvent(current, event);
            conn.setMembership(membershipOf(next, userId));
            return next;
          });
        },
        onChat: (envelope) => {
          const { messageId } = envelope.payload;
          if (seenMessageIds.current.has(messageId)) return;
          seenMessageIds.current.add(messageId);
          setChatMessages((current) => [...current, envelope.payload].slice(-CHAT_HISTORY_LIMIT));
        },
        onError: setLastError,
        onConnectionChange: setConnected,
      },
    );
    setConnection(conn);

    return () => {
      conn.close();
      setConnection(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, instanceHint]);

  return { snapshot, connected, chatMessages, lastError, connection };
}
