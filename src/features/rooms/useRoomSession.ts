import { useState } from "react";
import { useNavigate } from "react-router";
import { useToast } from "@astryxdesign/core/Toast";
import { useAuth } from "../auth/auth-context";
import { leaveRoom } from "./roomsApi";
import type { RoomResource } from "./rooms-types";
import { useLeaveWarning } from "./useLeaveWarning";
import { useRoomConnection } from "./useRoomConnection";

/**
 * The joined room: the one socket (`useRoomConnection`), the game session on screen, leaving, and
 * the invite link. Everything the room screen renders is read off what this returns.
 */
export function useRoomSession(roomId: string, room: RoomResource, instanceHint: string | null) {
  const navigate = useNavigate();
  const showToast = useToast();
  const { principal } = useAuth();
  const userId = principal?.userId ?? null;
  const connectionState = useRoomConnection(roomId, instanceHint);
  const { snapshot, ended } = connectionState;

  // The session on screen. It outlives `GAME_ENDED` (the snapshot's `sessionId` is cleared then)
  // until the player dismisses the results; derived during render, not in an effect.
  const [game, setGame] = useState<{ sessionId: string; gameFrontendUrl: string } | null>(null);
  if (
    snapshot?.state === "IN_PROGRESS" &&
    snapshot.sessionId &&
    snapshot.gameFrontendUrl &&
    game?.sessionId !== snapshot.sessionId
  ) {
    setGame({ sessionId: snapshot.sessionId, gameFrontendUrl: snapshot.gameFrontendUrl });
  }

  // FR-DC-008: a participant in Lobby, or on the results overlay (the snapshot is back in LOBBY),
  // loses the seat on a reload — ask first. Not for spectators, In Progress rooms or a left room.
  const [left, setLeft] = useState(false);
  const isPlayer = snapshot?.players.some((player) => player.playerId === userId);
  useLeaveWarning(Boolean(isPlayer) && snapshot?.state === "LOBBY" && !ended && !left);

  return {
    ...connectionState,
    userId,
    game,
    inviteCode: room.inviteCode,
    visibility: room.visibility,
    gameId: room.gameId,
    minPlayers: room.minPlayers,
    maxPlayers: room.maxPlayers,
    leave: () => {
      leaveRoom(roomId)
        .then(() => {
          setLeft(true);
          void navigate("/rooms");
        })
        .catch(() => {
          showToast({ type: "error", body: "Could not leave the room." });
        });
    },
    shareInvite: () => {
      if (!room.inviteCode) return;
      const link = `${window.location.origin}/rooms/join/${room.inviteCode}`;
      navigator.clipboard
        .writeText(link)
        .then(() => {
          showToast({ type: "info", body: "Invite link copied." });
        })
        .catch(() => {
          showToast({ type: "info", body: link });
        });
    },
    returnToLobby: () => {
      setGame(null);
    },
  };
}

export type RoomSession = ReturnType<typeof useRoomSession>;
