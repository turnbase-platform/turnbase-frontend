import type { CatalogGame } from "./catalog-types";

/** FR-CAT-002's players range, as the card and the detail page both write it. */
export function playerRange(game: Pick<CatalogGame, "minPlayers" | "maxPlayers">): string {
  return game.minPlayers === game.maxPlayers
    ? String(game.minPlayers)
    : `${String(game.minPlayers)}–${String(game.maxPlayers)}`;
}
