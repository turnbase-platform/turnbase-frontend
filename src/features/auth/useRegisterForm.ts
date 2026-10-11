import { useState, type SubmitEvent } from "react";
import { useSearchParams } from "react-router";
import type { TextInputStatus } from "@astryxdesign/core/TextInput";
import { useAuth } from "./auth-context";
import { useGoogleAvailable } from "./useGoogleAvailable";

/** VW-REG-001…003. As with login, the route guard performs the post-success redirect. */
export function useRegisterForm() {
  const { register } = useAuth();
  const google = useGoogleAvailable();
  const [params] = useSearchParams();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [isBusy, setIsBusy] = useState(false);

  // The server owns validation (input-validation.md); this one check only saves a round trip.
  const mismatch: TextInputStatus | undefined =
    confirmPassword && confirmPassword !== password
      ? { type: "error", message: "Passwords do not match." }
      : undefined;

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mismatch) return;
    setIsBusy(true);
    setError(null);
    register({ username, email, password, confirmPassword }).catch((failure: unknown) => {
      setError(failure);
      setIsBusy(false);
    });
  }

  return {
    username,
    setUsername,
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    mismatch,
    error,
    isBusy,
    submit,
    google,
    redirect: params.get("redirect"),
  };
}

export type RegisterForm = ReturnType<typeof useRegisterForm>;
