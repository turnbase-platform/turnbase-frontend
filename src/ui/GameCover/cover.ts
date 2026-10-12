import { PIECES } from "../PixelArt/pieces";

export type CoverPiece = keyof typeof PIECES;
export type CoverTone = "a" | "b" | "c";

export interface Cover {
  piece: CoverPiece;
  tone: CoverTone;
}

const PIECE_NAMES = Object.keys(PIECES) as CoverPiece[];
const TONES: readonly CoverTone[] = ["a", "b", "c"];

/** FNV-1a: small, stable across sessions, spreads short ids well. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * The cover of a game the catalogue serves no art for: a generic piece on one of the three glows,
 * derived from the game id so the same game looks the same on every screen and every visit.
 * Pure — no game is named here.
 */
export function coverFor(gameId: string): Cover {
  const h = hash(gameId);
  return {
    piece: PIECE_NAMES[h % PIECE_NAMES.length] ?? "meeple",
    tone: TONES[(h >>> 8) % TONES.length] ?? "a",
  };
}
