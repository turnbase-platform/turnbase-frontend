/** `catalog-rest-api.md` §3: one row of `GET /api/games`. */
export type Badge = "OFFICIAL" | "VERIFIED" | "UNVERIFIED";

export interface CatalogGame {
  gameId: string;
  title: string;
  authorUsername: string;
  shortDescription: string;
  minPlayers: number;
  maxPlayers: number;
  supportsAi: boolean;
  supportsSpectators: boolean;
  version: string;
  badge: Badge;
  createdAt: string;
  updatedAt: string;
}

/** `catalog-rest-api.md` §4: `GET /api/games/{gameId}`. */
/** `catalog-rest-api.md` §4 — the manifest's `credits`. */
export interface GameCredits {
  designers: string[];
  artists?: string[];
  publisher?: string;
  year?: number;
}

export interface GameDetail extends Omit<CatalogGame, "shortDescription"> {
  shortDescription: string;
  /** Raw Markdown source, or `null` when the developer supplied none (FR-GDET-003). */
  infoDocMarkdown: string | null;
  tags: string[];
  /** The original work this game implements, or `null` for an original game (VW-GDET-004). */
  credits: GameCredits | null;
  activePlayerCount: number;
  completedSessionCount: number;
}

/** `catalog-rest-api.md` §3's `sort` whitelist (FR-CAT-007). */
export type CatalogSortField =
  "title" | "author" | "minPlayers" | "maxPlayers" | "version" | "createdAt" | "updatedAt";
