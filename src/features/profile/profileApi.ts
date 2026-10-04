import { apiFetch } from "../../shared/api";
import type { ListEnvelope } from "../../shared/pagination";
import type { ProfileResponse } from "./profile-types";

/** `profile-rest-api.md` §1: `GET /api/users/{username}`. */
export function fetchProfile(username: string): Promise<ProfileResponse> {
  return apiFetch<ProfileResponse>(`/api/users/${encodeURIComponent(username)}`);
}

/** `catalog-rest-api.md` §3: one row of the `owner`-filtered catalog listing. */
export interface OwnedGame {
  gameId: string;
  title: string;
  shortDescription: string;
  badge: "OFFICIAL" | "VERIFIED" | "UNVERIFIED";
}

export function fetchOwnedGames(username: string): Promise<ListEnvelope<OwnedGame>> {
  return apiFetch<ListEnvelope<OwnedGame>>(`/api/games?owner=${encodeURIComponent(username)}`);
}

/** `statistics-rest-api.md` §2: `GET /api/users/{username}/statistics`. */
export interface Statistics {
  totalPlayed: number;
  mostPlayedGame: { gameId: string; title: string } | null;
}

export function fetchStatistics(username: string): Promise<Statistics> {
  return apiFetch<Statistics>(`/api/users/${encodeURIComponent(username)}/statistics`);
}
