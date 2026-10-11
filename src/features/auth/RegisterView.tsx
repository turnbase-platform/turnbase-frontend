import { Button } from "@astryxdesign/core/Button";
import { Divider } from "@astryxdesign/core/Divider";
import { Link } from "@astryxdesign/core/Link";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { autofill } from "../../shared/autofill";
import { ILock, IMail, IUser, CardPage, FormFields } from "../../ui";
import { fieldStatus } from "./fieldStatus";
import { FormError, GoogleButton } from "./forms";
import type { RegisterForm } from "./useRegisterForm";

/** The registration screen, rendered from a {@link RegisterForm}. */
export function RegisterView({ form }: { form: RegisterForm }) {
  const { error, redirect } = form;
  return (
    <CardPage title="Create an account" subtitle="It takes a minute. Then pick a game.">
      <form onSubmit={form.submit} noValidate>
        <FormFields>
          <TextInput
            label="Username"
            value={form.username}
            onChange={form.setUsername}
            startIcon={IUser}
            status={fieldStatus(error, "username")}
            htmlName="username"
            isRequired
          />
          <TextInput
            label="Email"
            type="email"
            value={form.email}
            onChange={form.setEmail}
            startIcon={IMail}
            status={fieldStatus(error, "email")}
            htmlName="email"
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
            {...autofill("new-password")}
            isRequired
          />
          <TextInput
            label="Confirm password"
            type="password"
            value={form.confirmPassword}
            onChange={form.setConfirmPassword}
            status={form.mismatch ?? fieldStatus(error, "confirmPassword")}
            htmlName="confirmPassword"
            {...autofill("new-password")}
            isRequired
          />
          <FormError error={error} />
          <Button
            type="submit"
            label="Register"
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
        Already registered?{" "}
        <Link href={redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : "/login"}>
          Log in
        </Link>
      </Text>
    </CardPage>
  );
}
