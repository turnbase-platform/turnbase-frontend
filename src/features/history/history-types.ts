/** `history-rest-api.md` §4: one card's worth of a finished session. */
export interface HistoryEntry {
  gameId: string;
  gameName: string;
  /** `false` once the game is soft-deleted — the name is then plain text (FR-HIST-023). */
  gameLinkable: boolean;
  completedAt: string;
  outcomeLabel: string;
  /** Omitted by the server when empty (FR-HIST-022). */
  playerStats?: Record<string, unknown>;
  teamStats?: Record<string, unknown>;
}
