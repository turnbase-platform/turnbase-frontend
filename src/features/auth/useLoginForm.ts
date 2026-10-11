import { useState, type SubmitEvent } from "react";
import { useSearchParams } from "react-router";
import { useAuth } from "./auth-context";
import { useGoogleAvailable } from "./useGoogleAvailable";

/** VW-LOGIN-001…004. A success is not navigated to here: the route guard sees the principal
 * appear on an anonymous-only route and performs VW-REDIR-004/005/006 for every entry point. */
export function useLoginForm() {
  const { login } = useAuth();
  const google = useGoogleAvailable();
  const [params] = useSearchParams();
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [isBusy, setIsBusy] = useState(false);

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsBusy(true);
    setError(null);
    login({ usernameOrEmail, password }).catch((failure: unknown) => {
      setError(failure);
      setIsBusy(false);
    });
  }

  return {
    usernameOrEmail,
    setUsernameOrEmail,
    password,
    setPassword,
    error,
    isBusy,
    submit,
    google,
    redirect: params.get("redirect"),
    oauthFailed: params.has("oauthError"),
  };
}

export type LoginForm = ReturnType<typeof useLoginForm>;
