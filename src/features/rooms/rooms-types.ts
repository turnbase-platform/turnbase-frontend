/** `room-rest-api.md` §3 — one row of the rooms list. */
export interface RoomListRow {
  roomId: string;
  gameId: string;
  gameName: string;
  hostUsername: string;
  state: "LOBBY" | "IN_PROGRESS";
  playerCount: number;
  playerCapacity: number;
  minPlayers: number;
  maxPlayers: number;
  spectatingSupported: boolean;
  spectatorCount: number;
  canJoin: boolean;
  canSpectate: boolean;
}

/** `room-rest-api.md` § *The `reservedSlot` field* — global, not scoped to any row on the page. */
export interface ReservedSlot {
  roomId: string;
  gameName: string;
  graceRemainingSeconds: number;
}

/** `room-rest-api.md` §3 — the list envelope, with `reservedSlot` alongside `pagination`. */
export interface RoomListEnvelope {
  content: RoomListRow[];
  pagination: {
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
  };
  reservedSlot: ReservedSlot | null;
}

/** `room-rest-api.md` §4 — the full room resource. */
export interface RoomResource {
  roomId: string;
  gameId: string;
  gameName: string;
  gameVersion: string;
  state: "LOBBY" | "IN_PROGRESS";
  visibility: "PUBLIC" | "FRIENDS_ONLY" | "INVITE_ONLY";
  hostUserId: string;
  hostUsername: string;
  spectatingEnabled: boolean;
  spectatorCapacity: number;
  spectatorCount: number;
  playerCount: number;
  playerCapacity: number;
  minPlayers: number;
  maxPlayers: number;
  inviteCode?: string;
  canJoin: boolean;
  canSpectate: boolean;
  /** `room-rest-api.md` §4 — the caller's own membership; absent from list rows. */
  viewerRole: "PLAYER" | "SPECTATOR" | null;
  version: number;
  createdAt: string;
}

/** `room-rest-api.md` §5 — the room the caller was released from by the single-room constraint. */
export interface ReleasedRoom {
  roomId: string;
  reason: "LEFT" | "EARLY_RELEASE";
}

export interface JoinRoomResult {
  room: RoomResource;
  releasedRoom: ReleasedRoom | null;
}

// --- room-websocket.md § Server→Client Event Catalogue --------------------------------------

export interface RoomPlayer {
  playerId: string;
  username: string;
  teamId: string | null;
  ready: boolean;
  connected: boolean;
  joinOrder: number;
}

export interface RoomAiPlayer {
  aiPlayerId: string;
  displayName: string;
  teamId: string;
}

export interface RoomSpectator {
  playerId: string;
  username: string;
}

export interface RoomTeam {
  teamId: string;
  templateName: string;
  configuredSize: number;
  index: number;
  memberIds: string[];
}

export interface DisconnectedPlayer {
  playerId: string;
  graceRemainingSeconds: number;
}

/** `room-websocket.md` § `ROOM_STATE` — the unicast snapshot payload. */
export interface RoomStateSnapshot {
  roomId: string;
  state: "LOBBY" | "IN_PROGRESS";
  gameId: string;
  gameName: string;
  spectatingEnabled: boolean;
  spectatorCapacity: number;
  hostId: string;
  players: RoomPlayer[];
  aiPlayers: RoomAiPlayer[];
  spectators: RoomSpectator[];
  teams: RoomTeam[];
  parameters: Record<string, unknown>;
  disconnectedPlayers: DisconnectedPlayer[];
  sessionId: string | null;
  gameFrontendUrl: string | null;
}

/** `room-websocket.md` § Server→Client Event Catalogue — every event on `/topic/room.{roomId}`. */
export type RoomEvent =
  | {
      type: "PLAYER_JOINED";
      payload: {
        playerId: string;
        username: string;
        role: "PLAYER" | "SPECTATOR";
        teamId: string | null;
        joinOrder: number;
      };
    }
  | { type: "AI_PLAYER_ADDED"; payload: RoomAiPlayer }
  | { type: "PLAYER_LEFT"; payload: { playerId: string; role: "PLAYER" | "SPECTATOR" } }
  | { type: "PLAYER_KICKED"; payload: { playerId: string; byHostId: string } }
  | {
      type: "PLAYER_ROLE_CHANGED";
      payload: {
        playerId: string;
        newRole: "SPECTATOR" | "PLAYER";
        teamId: string | null;
        readinessCleared: boolean;
      };
    }
  | {
      type: "HOST_TRANSFERRED";
      payload: {
        newHostId: string;
        previousHostId: string;
        reason: "VOLUNTARY" | "HOST_LEFT" | "HOST_DISCONNECTED";
      };
    }
  | {
      type: "ROOM_CLOSED";
      payload: {
        roomId: string;
        reason:
          "NO_PLAYERS_REMAINING" | "GRACE_EXPIRED_NO_HUMAN" | "ACCOUNT_DELETED" | "IDLE_TIMEOUT";
      };
    }
  | { type: "GAME_STARTED"; payload: { sessionId: string; gameFrontendUrl: string } }
  | { type: "GAME_ENDED"; payload: { roomId: string; readinessReset: boolean } }
  | { type: "READINESS_CHANGED"; payload: { playerId: string; ready: boolean } }
  | {
      type: "TEAM_ADDED";
      payload: { teamId: string; templateName: string; configuredSize: number; index: number };
    }
  | { type: "TEAM_REMOVED"; payload: { teamId: string } }
  | { type: "TEAM_RESIZED"; payload: { teamId: string; newConfiguredSize: number } }
  | {
      type: "PLAYER_REASSIGNED";
      payload: { playerId: string; fromTeamId: string; toTeamId: string; readinessReset: boolean };
    }
  | { type: "PARAMETERS_CHANGED"; payload: { parameters: Record<string, unknown> } }
  | { type: "PLAYER_DISCONNECTED"; payload: { playerId: string; gracePeriodSeconds: number } }
  | { type: "PLAYER_RECONNECTED"; payload: { playerId: string } }
  | {
      type: "PLAYER_LOST";
      payload: { playerId: string; teamId: string; reason: "GRACE_PERIOD_EXPIRED" };
    };

/** `room-websocket.md` § Message Envelope — every event on `/topic/room.{roomId}` carries `version`. */
export type RoomEventEnvelope = RoomEvent & { version: number };

/** `room-websocket.md` § `ROOM_STATE` envelope, unicast on `/user/queue/room-state`. */
export interface RoomStateEnvelope {
  type: "ROOM_STATE";
  version: number;
  payload: RoomStateSnapshot;
}

/** `room-chat-websocket.md` § `CHAT_MESSAGE` — `version` is always `null` and never reconciled. */
export interface ChatMessageEnvelope {
  type: "CHAT_MESSAGE";
  version: null;
  payload: {
    messageId: string;
    channel: "ROOM" | "TEAM";
    teamId: string | null;
    authorId: string;
    authorUsername: string;
    text: string;
    serverTimestamp: string;
  };
}

/** `room-websocket.md` § Error Handling — the `/user/queue/errors` envelope. */
export interface RoomErrorEnvelope {
  type: "ERROR";
  payload: {
    correlationId?: string;
    code: string;
    message: string;
    roomId?: string;
    details?: Record<string, unknown>;
    retryAfterMs?: number;
  };
}
