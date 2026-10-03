import type { RoomStateSnapshot } from "./rooms-types";

/**
 * FR-CHAN-002 — the game "declares team support" when its teams hold more than one player. Every
 * manifest has at least one team template, so a one-seat-per-team game (Tic-Tac-Toe's X and O) has
 * teams but nobody to talk to in them.
 */
export function hasTeamChannel(snapshot: RoomStateSnapshot): boolean {
  return snapshot.teams.some((team) => team.configuredSize > 1);
}

/**
 * The conditions the snapshot lets the client see (FR-TEAM-009 (c), and enough players to fill the
 * game's teams). The server stays the authority — it also checks each team's size and count, and
 * rejects with `START_CONDITIONS_NOT_MET` — so this only decides whether to offer the control.
 */
export function unmetStartConditions(snapshot: RoomStateSnapshot, minPlayers: number): string[] {
  const unmet: string[] = [];
  const seated = snapshot.players.length + snapshot.aiPlayers.length;
  if (seated < minPlayers) {
    unmet.push(`The game needs at least ${String(minPlayers)} players; ${String(seated)} joined.`);
  }
  for (const entry of snapshot.players) {
    if (entry.playerId !== snapshot.hostId && !entry.ready) {
      unmet.push(`${entry.username} is not ready.`);
    }
  }
  return unmet;
}
