import { useEffect, useState, type SubmitEvent } from "react";
import { useNavigate } from "react-router";
import { ApiError, apiFetch } from "../../shared/api";
import { useAuth, type Principal } from "./auth-context";

type Pending = { state: "loading" } | { state: "missing" } | { state: "ready"; email: string };

/**
 * VW-OAUTHCOMP-001…002 (`oauth-rest-api.md` §5–6). The Google identity lives in the
 * `turnbase_oauth_pending` cookie, which is HttpOnly — the page learns only the email.
 */
export function useOAuthCompletion() {
  const { acceptPrincipal } = useAuth();
  const navigate = useNavigate();
  const [pending, setPending] = useState<Pending>({ state: "loading" });
  const [username, setUsername] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [collision, setCollision] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiFetch<{ email: string }>("/api/auth/oauth/pending")
      .then(({ email }) => {
        if (!cancelled) setPending({ state: "ready", email });
      })
      .catch(() => {
        if (!cancelled) setPending({ state: "missing" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsBusy(true);
    setError(null);
    apiFetch<Principal | { outcome: "CHALLENGE_REQUIRED" }>(
      "/api/auth/oauth/complete-registration",
      { method: "POST", body: { username } },
    )
      .then(async (result) => {
        if ("outcome" in result) {
          setCollision(true);
          setIsBusy(false);
          return;
        }
        acceptPrincipal(result);
        await navigate("/rooms", { replace: true });
      })
      .catch((failure: unknown) => {
        // The pending record expired while the form was open: nothing left to finish.
        if (failure instanceof ApiError && failure.status === 404) {
          setPending({ state: "missing" });
          return;
        }
        setError(failure);
        setIsBusy(false);
      });
  }

  return {
    pending,
    email: pending.state === "ready" ? pending.email : "",
    username,
    setUsername,
    error,
    collision,
    isBusy,
    submit,
  };
}

export type OAuthCompletion = ReturnType<typeof useOAuthCompletion>;
