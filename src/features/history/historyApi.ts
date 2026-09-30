import { apiFetch } from "../../shared/api";
import type { ListEnvelope } from "../../shared/pagination";
import type { HistoryEntry } from "./history-types";

export const HISTORY_PAGE_SIZE = 25; // FR-HIST-026

/** `history-rest-api.md` §3: search, page and size are query parameters, never a client filter. */
export function fetchHistory(
  username: string,
  params: { search: string; page: number; size?: number },
): Promise<ListEnvelope<HistoryEntry>> {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  query.set("page", String(params.page));
  query.set("size", String(params.size ?? HISTORY_PAGE_SIZE));
  return apiFetch<ListEnvelope<HistoryEntry>>(
    `/api/users/${encodeURIComponent(username)}/history?${query.toString()}`,
  );
}
