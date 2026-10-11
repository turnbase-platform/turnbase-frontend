import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Divider } from "@astryxdesign/core/Divider";
import { Link } from "@astryxdesign/core/Link";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { autofill } from "../../shared/autofill";
import { ILock, IUser } from "../../ui";
import { AuthLayout, FormFields } from "./AuthLayout";
import { fieldStatus } from "./fieldStatus";
import { FormError, GoogleButton } from "./forms";
import type { LoginForm } from "./useLoginForm";

/** The login screen, rendered from a {@link LoginForm}. */
export function LoginView({ form }: { form: LoginForm }) {
  const { error, redirect } = form;
  return (
    <AuthLayout title="Log in" subtitle="Pick up where you left off.">
      {form.oauthFailed && (
        <Banner status="error" title="Google sign-in did not complete. Please try again." />
      )}
      <form onSubmit={form.submit} noValidate>
        <FormFields>
          <TextInput
            label="Username or email"
            value={form.usernameOrEmail}
            onChange={form.setUsernameOrEmail}
            startIcon={IUser}
            status={fieldStatus(error, "usernameOrEmail")}
            htmlName="usernameOrEmail"
            {...autofill("username")}
            isRequired
          />
          <TextInput
            label="Password"
            type="password"
            value={form.password}
            onChange={form.setPassword}
            startIcon={ILock}
            status={fieldStatus(error, "password")}
            htmlName="password"
            {...autofill("current-password")}
            isRequired
          />
          <FormError error={error} unauthorizedMessage="Incorrect username, email or password." />
          <Button
            type="submit"
            label="Log in"
            variant="primary"
            size="lg"
            isLoading={form.isBusy}
            width="100%"
          />
        </FormFields>
      </form>
      {form.google && (
        <>
          <Divider label="or" />
          <GoogleButton redirect={redirect} />
        </>
      )}
      <Text type="supporting" color="secondary">
        No account yet?{" "}
        <Link href={redirect ? `/register?redirect=${encodeURIComponent(redirect)}` : "/register"}>
          Register
        </Link>
      </Text>
    </AuthLayout>
  );
}
