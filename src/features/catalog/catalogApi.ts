import { apiFetch } from "../../shared/api";
import type { ListEnvelope } from "../../shared/pagination";
import type { CatalogGame, CatalogSortField, GameDetail } from "./catalog-types";

export interface CatalogQuery {
  search: string;
  minPlayers: number | null;
  maxPlayers: number | null;
  sort: CatalogSortField;
  direction: "asc" | "desc";
  page: number;
  size: number;
}

/** `catalog-rest-api.md` §3 — every filter is server-side (`game-catalog.md` CON-002). */
export function listGames(query: CatalogQuery): Promise<ListEnvelope<CatalogGame>> {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.minPlayers !== null) params.set("minPlayers", String(query.minPlayers));
  if (query.maxPlayers !== null) params.set("maxPlayers", String(query.maxPlayers));
  params.set("sort", `${query.sort},${query.direction}`);
  params.set("page", String(query.page));
  params.set("size", String(query.size));
  return apiFetch<ListEnvelope<CatalogGame>>(`/api/games?${params.toString()}`);
}

/** `catalog-rest-api.md` §4 — `404` for invisible, `410` for soft-deleted. */
export function getGame(gameId: string): Promise<GameDetail> {
  return apiFetch<GameDetail>(`/api/games/${encodeURIComponent(gameId)}`);
}
