import { useEffect, useState } from "react";
import { fetchFriends } from "../friends/friendsApi";
import type { FriendSummary } from "../friends/friends-types";
import { fetchOwnedGames, type OwnedGame } from "./profileApi";

export type ListState<T> =
  { status: "loading" } | { status: "loaded"; items: T[] } | { status: "error" };

/** Loads a profile section's list; `retry` re-runs it after a failure. */
function useSectionList<T>(load: () => Promise<T[]>, key: string) {
  const [state, setState] = useState<ListState<T>>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    load()
      .then((items) => {
        if (!cancelled) setState({ status: "loaded", items });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
    // `load` is a fresh closure per render; `key` (the username) is what it depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt]);

  return {
    state,
    retry: () => {
      setState({ status: "loading" });
      setAttempt((n) => n + 1);
    },
  };
}

/** The profile's Friends section — one list, no presence (ADR-0017 §4). */
export function useProfileFriends(username: string) {
  return useSectionList<FriendSummary>(
    () => fetchFriends(username).then((page) => page.content),
    username,
  );
}

/** The profile's Uploaded games section. */
export function useUploadedGames(username: string) {
  return useSectionList<OwnedGame>(
    () => fetchOwnedGames(username).then((page) => page.content),
    username,
  );
}
