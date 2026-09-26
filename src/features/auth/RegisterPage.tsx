import { useState, type SubmitEvent } from "react";
import { useSearchParams } from "react-router";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { Link } from "@astryxdesign/core/Link";
import { Stack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { TextInput, type TextInputStatus } from "@astryxdesign/core/TextInput";
import { useAuth } from "./auth-context";
import { FormError, GoogleButton } from "./forms";
import { fieldStatus } from "./fieldStatus";
import { useGoogleAvailable } from "./useGoogleAvailable";

/** VW-REG-001…003. As with login, the route guard performs the post-success redirect. */
export function RegisterPage() {
  const { register } = useAuth();
  const google = useGoogleAvailable();
  const [params] = useSearchParams();
  const redirect = params.get("redirect");
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

  return (
    <Stack gap={4} maxWidth={420} padding={6}>
      <Heading level={1}>Create an account</Heading>
      <form onSubmit={submit} noValidate>
        <Stack gap={3}>
          <TextInput
            label="Username"
            value={username}
            onChange={setUsername}
            status={fieldStatus(error, "username")}
            htmlName="username"
            isRequired
          />
          <TextInput
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            status={fieldStatus(error, "email")}
            htmlName="email"
            isRequired
          />
          <TextInput
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            status={fieldStatus(error, "password")}
            htmlName="password"
            isRequired
          />
          <TextInput
            label="Confirm password"
            type="password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            status={mismatch ?? fieldStatus(error, "confirmPassword")}
            htmlName="confirmPassword"
            isRequired
          />
          <FormError error={error} />
          <Button
            type="submit"
            label="Register"
            variant="primary"
            isLoading={isBusy}
            width="100%"
          />
        </Stack>
      </form>
      {google && <GoogleButton redirect={redirect} />}
      <Text>
        Already registered?{" "}
        <Link href={redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : "/login"}>
          Log in
        </Link>
      </Text>
    </Stack>
  );
}
