import { useState, type SubmitEvent } from "react";
import { useSearchParams } from "react-router";
import { Button } from "@astryxdesign/core/Button";
import { Banner } from "@astryxdesign/core/Banner";
import { Heading } from "@astryxdesign/core/Heading";
import { Link } from "@astryxdesign/core/Link";
import { Stack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { useAuth } from "./auth-context";
import { FormError, GoogleButton } from "./forms";
import { fieldStatus } from "./fieldStatus";
import { useGoogleAvailable } from "./useGoogleAvailable";
import { autofill } from "../../shared/autofill";

/** VW-LOGIN-001…004. A success is not navigated to here: the route guard sees the principal
 * appear on an anonymous-only route and performs VW-REDIR-004/005/006 for every entry point. */
export function LoginPage() {
  const { login } = useAuth();
  const google = useGoogleAvailable();
  const [params] = useSearchParams();
  const redirect = params.get("redirect");
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

  return (
    <Stack gap={4} maxWidth={420} padding={6}>
      <Heading level={1}>Log in</Heading>
      {params.has("oauthError") && (
        <Banner status="error" title="Google sign-in did not complete. Please try again." />
      )}
      <form onSubmit={submit} noValidate>
        <Stack gap={3}>
          <TextInput
            label="Username or email"
            value={usernameOrEmail}
            onChange={setUsernameOrEmail}
            status={fieldStatus(error, "usernameOrEmail")}
            htmlName="usernameOrEmail"
            {...autofill("username")}
            isRequired
          />
          <TextInput
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            status={fieldStatus(error, "password")}
            htmlName="password"
            {...autofill("current-password")}
            isRequired
          />
          <FormError error={error} unauthorizedMessage="Incorrect username, email or password." />
          <Button type="submit" label="Log in" variant="primary" isLoading={isBusy} width="100%" />
        </Stack>
      </form>
      {google && <GoogleButton redirect={redirect} />}
      <Text>
        No account yet?{" "}
        <Link href={redirect ? `/register?redirect=${encodeURIComponent(redirect)}` : "/register"}>
          Register
        </Link>
      </Text>
    </Stack>
  );
}
