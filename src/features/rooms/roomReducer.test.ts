import { describe, expect, it } from "vitest";
import { applyRoomEvent } from "./roomReducer";
import type { RoomStateSnapshot } from "./rooms-types";

function baseState(overrides: Partial<RoomStateSnapshot> = {}): RoomStateSnapshot {
  return {
    roomId: "room-1",
    state: "LOBBY",
    gameId: "g-1",
    gameName: "Chess",
    spectatingEnabled: true,
    spectatorCapacity: 4,
    hostId: "u-1",
    players: [
      {
        playerId: "u-1",
        username: "alice",
        teamId: "t-1",
        ready: false,
        connected: true,
        joinOrder: 1,
      },
    ],
    aiPlayers: [],
    spectators: [],
    teams: [
      { teamId: "t-1", templateName: "Red", configuredSize: 2, index: 0, memberIds: ["u-1"] },
      { teamId: "t-2", templateName: "Blue", configuredSize: 2, index: 1, memberIds: [] },
    ],
    parameters: {},
    disconnectedPlayers: [],
    sessionId: null,
    gameFrontendUrl: null,
    ...overrides,
  };
}

describe("applyRoomEvent", () => {
  it("adds a joining player to players, not spectators", () => {
    const next = applyRoomEvent(baseState(), {
      type: "PLAYER_JOINED",
      payload: { playerId: "u-2", username: "bob", role: "PLAYER", teamId: "t-2", joinOrder: 2 },
    });
    expect(next.players).toHaveLength(2);
    expect(next.spectators).toHaveLength(0);
  });

  it("adds a joining spectator to spectators, not players", () => {
    const next = applyRoomEvent(baseState(), {
      type: "PLAYER_JOINED",
      payload: { playerId: "u-2", username: "bob", role: "SPECTATOR", teamId: null, joinOrder: 2 },
    });
    expect(next.spectators).toEqual([{ playerId: "u-2", username: "bob" }]);
    expect(next.players).toHaveLength(1);
  });

  it("removes a departing player from players", () => {
    const next = applyRoomEvent(baseState(), {
      type: "PLAYER_LEFT",
      payload: { playerId: "u-1", role: "PLAYER" },
    });
    expect(next.players).toHaveLength(0);
  });

  it("moves a player to spectators on a role change to SPECTATOR", () => {
    const next = applyRoomEvent(baseState(), {
      type: "PLAYER_ROLE_CHANGED",
      payload: { playerId: "u-1", newRole: "SPECTATOR", teamId: null, readinessCleared: true },
    });
    expect(next.players).toHaveLength(0);
    expect(next.spectators).toEqual([{ playerId: "u-1", username: "alice" }]);
  });

  it("moves a spectator to players with the given team on a role change to PLAYER", () => {
    const state = baseState({ spectators: [{ playerId: "u-2", username: "bob" }], players: [] });
    const next = applyRoomEvent(state, {
      type: "PLAYER_ROLE_CHANGED",
      payload: { playerId: "u-2", newRole: "PLAYER", teamId: "t-2", readinessCleared: false },
    });
    expect(next.spectators).toHaveLength(0);
    expect(next.players).toEqual([
      {
        playerId: "u-2",
        username: "bob",
        teamId: "t-2",
        ready: false,
        connected: true,
        joinOrder: 2,
      },
    ]);
  });

  it("updates both teams' membership on a reassignment", () => {
    const next = applyRoomEvent(baseState(), {
      type: "PLAYER_REASSIGNED",
      payload: { playerId: "u-1", fromTeamId: "t-1", toTeamId: "t-2", readinessReset: false },
    });
    expect(next.teams.find((t) => t.teamId === "t-1")?.memberIds).toEqual([]);
    expect(next.teams.find((t) => t.teamId === "t-2")?.memberIds).toEqual(["u-1"]);
    expect(next.players[0]?.teamId).toBe("t-2");
  });

  it("clears every player's readiness on GAME_ENDED", () => {
    const state = baseState({
      players: [
        {
          playerId: "u-1",
          username: "alice",
          teamId: "t-1",
          ready: true,
          connected: true,
          joinOrder: 1,
        },
      ],
      state: "IN_PROGRESS",
      sessionId: "s-1",
    });
    const next = applyRoomEvent(state, {
      type: "GAME_ENDED",
      payload: { roomId: "room-1", readinessReset: true },
    });
    expect(next.state).toBe("LOBBY");
    expect(next.sessionId).toBeNull();
    expect(next.players[0]?.ready).toBe(false);
  });

  it("marks a player disconnected with a grace period, and reconnecting clears it", () => {
    const disconnected = applyRoomEvent(baseState(), {
      type: "PLAYER_DISCONNECTED",
      payload: { playerId: "u-1", gracePeriodSeconds: 30 },
    });
    expect(disconnected.players[0]?.connected).toBe(false);
    expect(disconnected.disconnectedPlayers).toEqual([
      { playerId: "u-1", graceRemainingSeconds: 30 },
    ]);

    const reconnected = applyRoomEvent(disconnected, {
      type: "PLAYER_RECONNECTED",
      payload: { playerId: "u-1" },
    });
    expect(reconnected.players[0]?.connected).toBe(true);
    expect(reconnected.disconnectedPlayers).toEqual([]);
  });

  it("removes a player whose grace period expired on PLAYER_LOST", () => {
    const next = applyRoomEvent(baseState(), {
      type: "PLAYER_LOST",
      payload: { playerId: "u-1", teamId: "t-1", reason: "GRACE_PERIOD_EXPIRED" },
    });
    expect(next.players).toHaveLength(0);
  });

  it("is a no-op on ROOM_CLOSED, since the view unmounts on receipt", () => {
    const state = baseState();
    const next = applyRoomEvent(state, {
      type: "ROOM_CLOSED",
      payload: { roomId: "room-1", reason: "IDLE_TIMEOUT" },
    });
    expect(next).toBe(state);
  });
});
