import { useEffect, useState } from "react";
import { ApiError } from "../../shared/api";
import { fetchProfile } from "./profileApi";
import type { ProfileResponse } from "./profile-types";

export type ProfileState =
  | { status: "loading" }
  | { status: "loaded"; profile: ProfileResponse }
  | { status: "not-found" }
  | { status: "error" };

/** The profile envelope for `username` (`profile-rest-api.md` §2). `retry` re-runs a failed load. */
export function useProfile(username: string) {
  const [state, setState] = useState<ProfileState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchProfile(username)
      .then((profile) => {
        if (!cancelled) setState({ status: "loaded", profile });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState(
          error instanceof ApiError && error.status === 404
            ? { status: "not-found" }
            : { status: "error" },
        );
      });
    return () => {
      cancelled = true;
    };
  }, [username, attempt]);

  return {
    state,
    retry: () => {
      setState({ status: "loading" });
      setAttempt((n) => n + 1);
    },
  };
}

export type Profile = ReturnType<typeof useProfile>;
