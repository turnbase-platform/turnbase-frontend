import type { RoomEvent, RoomStateSnapshot } from "./rooms-types";

/**
 * Applies one `room-websocket.md` § Server→Client event to a `ROOM_STATE` snapshot. Pure and
 * synchronous so it can run directly off `roomSocket.ts`'s `onEvent` callback and be tested
 * without a socket. Never called for `CHAT_MESSAGE` — chat does not mutate room state.
 */
export function applyRoomEvent(state: RoomStateSnapshot, event: RoomEvent): RoomStateSnapshot {
  switch (event.type) {
    case "PLAYER_JOINED": {
      const { playerId, username, role, teamId, joinOrder } = event.payload;
      if (role === "SPECTATOR") {
        return { ...state, spectators: [...state.spectators, { playerId, username }] };
      }
      return {
        ...state,
        players: [
          ...state.players,
          { playerId, username, teamId, ready: false, connected: true, joinOrder },
        ],
      };
    }
    case "AI_PLAYER_ADDED":
      return { ...state, aiPlayers: [...state.aiPlayers, event.payload] };
    case "PLAYER_LEFT":
      return {
        ...state,
        players: state.players.filter((player) => player.playerId !== event.payload.playerId),
        spectators: state.spectators.filter(
          (spectator) => spectator.playerId !== event.payload.playerId,
        ),
      };
    case "PLAYER_KICKED":
      return {
        ...state,
        players: state.players.filter((player) => player.playerId !== event.payload.playerId),
        spectators: state.spectators.filter(
          (spectator) => spectator.playerId !== event.payload.playerId,
        ),
        aiPlayers: state.aiPlayers.filter(
          (aiPlayer) => aiPlayer.aiPlayerId !== event.payload.playerId,
        ),
      };
    case "PLAYER_ROLE_CHANGED": {
      const { playerId, newRole, teamId } = event.payload;
      if (newRole === "SPECTATOR") {
        const player = state.players.find((candidate) => candidate.playerId === playerId);
        return {
          ...state,
          players: state.players.filter((candidate) => candidate.playerId !== playerId),
          spectators: player
            ? [...state.spectators, { playerId: player.playerId, username: player.username }]
            : state.spectators,
        };
      }
      const spectator = state.spectators.find((candidate) => candidate.playerId === playerId);
      return {
        ...state,
        spectators: state.spectators.filter((candidate) => candidate.playerId !== playerId),
        players: spectator
          ? [
              ...state.players,
              {
                playerId: spectator.playerId,
                username: spectator.username,
                teamId,
                ready: false,
                connected: true,
                joinOrder: state.players.length + state.spectators.length + 1,
              },
            ]
          : state.players,
      };
    }
    case "HOST_TRANSFERRED":
      return { ...state, hostId: event.payload.newHostId };
    case "ROOM_CLOSED":
      return state; // the room view unmounts on receipt; nothing here still needs to render
    case "GAME_STARTED":
      return {
        ...state,
        state: "IN_PROGRESS",
        sessionId: event.payload.sessionId,
        gameFrontendUrl: event.payload.gameFrontendUrl,
      };
    case "GAME_ENDED":
      return {
        ...state,
        state: "LOBBY",
        sessionId: null,
        gameFrontendUrl: null,
        players: state.players.map((player) => ({ ...player, ready: false })),
      };
    case "READINESS_CHANGED":
      return {
        ...state,
        players: state.players.map((player) =>
          player.playerId === event.payload.playerId
            ? { ...player, ready: event.payload.ready }
            : player,
        ),
      };
    case "TEAM_ADDED":
      return {
        ...state,
        teams: [
          ...state.teams,
          {
            teamId: event.payload.teamId,
            templateName: event.payload.templateName,
            configuredSize: event.payload.configuredSize,
            index: event.payload.index,
            memberIds: [],
          },
        ],
      };
    case "TEAM_REMOVED":
      return {
        ...state,
        teams: state.teams.filter((team) => team.teamId !== event.payload.teamId),
      };
    case "TEAM_RESIZED":
      return {
        ...state,
        teams: state.teams.map((team) =>
          team.teamId === event.payload.teamId
            ? { ...team, configuredSize: event.payload.newConfiguredSize }
            : team,
        ),
      };
    case "PLAYER_REASSIGNED": {
      const { playerId, fromTeamId, toTeamId, readinessReset } = event.payload;
      return {
        ...state,
        players: state.players.map((player) =>
          player.playerId === playerId
            ? { ...player, teamId: toTeamId, ready: readinessReset ? false : player.ready }
            : player,
        ),
        teams: state.teams.map((team) => {
          if (team.teamId === fromTeamId) {
            return { ...team, memberIds: team.memberIds.filter((id) => id !== playerId) };
          }
          if (team.teamId === toTeamId) {
            return { ...team, memberIds: [...team.memberIds, playerId] };
          }
          return team;
        }),
      };
    }
    case "PARAMETERS_CHANGED":
      return { ...state, parameters: event.payload.parameters };
    case "PLAYER_DISCONNECTED":
      return {
        ...state,
        players: state.players.map((player) =>
          player.playerId === event.payload.playerId ? { ...player, connected: false } : player,
        ),
        disconnectedPlayers: [
          ...state.disconnectedPlayers,
          {
            playerId: event.payload.playerId,
            graceRemainingSeconds: event.payload.gracePeriodSeconds,
          },
        ],
      };
    case "PLAYER_RECONNECTED":
      return {
        ...state,
        players: state.players.map((player) =>
          player.playerId === event.payload.playerId ? { ...player, connected: true } : player,
        ),
        disconnectedPlayers: state.disconnectedPlayers.filter(
          (entry) => entry.playerId !== event.payload.playerId,
        ),
      };
    case "PLAYER_LOST":
      return {
        ...state,
        players: state.players.filter((player) => player.playerId !== event.payload.playerId),
        disconnectedPlayers: state.disconnectedPlayers.filter(
          (entry) => entry.playerId !== event.payload.playerId,
        ),
      };
    default:
      return state;
  }
}
