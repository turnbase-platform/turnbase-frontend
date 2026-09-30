/** What the shell accepts from the iframe (`frontend-gdk-api.md` §10, outbound side). */
export type GameOutbound = { type: "ready" } | { type: "action"; payload: unknown };

/** What the shell posts into the iframe (`frontend-gdk-api.md` §10). */
export interface GamePlayerRef {
  id: string;
  displayName: string;
  teamId?: string | null;
}

export type GameInbound =
  | { type: "init"; [field: string]: unknown }
  | { type: "game_event"; payload: unknown }
  | { type: "player_joined"; player: GamePlayerRef }
  | { type: "player_left"; player: GamePlayerRef }
  | { type: "game_over"; results: unknown };

/**
 * Shape validation of untrusted iframe input — parsed, not cast (`shell-architecture.md` §5,
 * check 3). Anything unrecognised, including extra `type`s, is dropped.
 */
export function parseGameOutbound(data: unknown): GameOutbound | null {
  if (typeof data !== "object" || data === null || Array.isArray(data)) return null;
  const record = data as Record<string, unknown>;
  if (record.type === "ready") return { type: "ready" };
  if (record.type === "action" && "payload" in record) {
    return { type: "action", payload: record.payload };
  }
  return null;
}
