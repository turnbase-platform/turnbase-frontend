import { useEffect, useState } from "react";
import type { ListEnvelope } from "../../shared/pagination";
import { fetchHistory } from "./historyApi";
import type { HistoryEntry } from "./history-types";

export type HistoryState =
  | { status: "loading" }
  | { status: "loaded"; result: ListEnvelope<HistoryEntry> }
  | { status: "error" };

/**
 * FR-HIST-020…027: one page of a user's history, searched and paged on the server. Changing the
 * search or the page collapses the open card; the list itself is never sliced or filtered here.
 */
export function useHistory(username: string) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [state, setState] = useState<HistoryState>({ status: "loading" });
  const [expanded, setExpanded] = useState<number | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchHistory(username, { search, page })
      .then((result) => {
        if (!cancelled) setState({ status: "loaded", result });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [username, search, page, attempt]);

  return {
    state,
    search,
    page,
    expanded,
    setSearch: (value: string) => {
      setSearch(value);
      setPage(1);
      setExpanded(null);
    },
    setPage: (next: number) => {
      setPage(next);
      setExpanded(null);
    },
    toggle: (index: number) => {
      setExpanded((current) => (current === index ? null : index));
    },
    retry: () => {
      setState({ status: "loading" });
      setAttempt((n) => n + 1);
    },
  };
}

export type History = ReturnType<typeof useHistory>;
