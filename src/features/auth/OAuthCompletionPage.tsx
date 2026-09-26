import { useEffect, useState, type SubmitEvent } from "react";
import { Navigate, useNavigate } from "react-router";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { Link } from "@astryxdesign/core/Link";
import { Spinner } from "@astryxdesign/core/Spinner";
import { Stack } from "@astryxdesign/core/Stack";
import { TextInput } from "@astryxdesign/core/TextInput";
import { ApiError, apiFetch } from "../../shared/api";
import { useAuth, type Principal } from "./auth-context";
import { FormError } from "./forms";
import { fieldStatus } from "./fieldStatus";

type Pending = { state: "loading" } | { state: "missing" } | { state: "ready"; email: string };

/**
 * VW-OAUTHCOMP-001…002 (`oauth-rest-api.md` §5–6). The Google identity lives in the
 * `turnbase_oauth_pending` cookie, which is HttpOnly — the page learns only the email.
 */
export function OAuthCompletionPage() {
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

  // "Direct access without pending registration → /login".
  if (pending.state === "missing") return <Navigate to="/login" replace />;
  if (pending.state === "loading") return <Spinner label="Loading" />;

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

  return (
    <Stack gap={4} maxWidth={420} padding={6}>
      <Heading level={1}>Choose a username</Heading>
      {collision && (
        <Banner
          status="warning"
          title="This email already has a TurnBase account."
          description={
            <>
              <Link href="/login">Log in</Link> with your password instead.
            </>
          }
        />
      )}
      <form onSubmit={submit} noValidate>
        <Stack gap={3}>
          <TextInput label="Email" value={pending.email} isReadOnly htmlName="email" />
          <TextInput
            label="Username"
            value={username}
            onChange={setUsername}
            status={fieldStatus(error, "username")}
            htmlName="username"
            isRequired
          />
          <FormError error={error} />
          <Button
            type="submit"
            label="Create account"
            variant="primary"
            isLoading={isBusy}
            width="100%"
          />
        </Stack>
      </form>
    </Stack>
  );
}
