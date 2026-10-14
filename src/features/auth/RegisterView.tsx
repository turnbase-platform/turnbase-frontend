import { Button } from "@astryxdesign/core/Button";
import { Divider } from "@astryxdesign/core/Divider";
import { Link } from "@astryxdesign/core/Link";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { autofill } from "../../shared/autofill";
import { ILock, IMail, IPlay, IUser, CardPage, FormFields } from "../../ui";
import { fieldStatus } from "./fieldStatus";
import { FormError, GoogleButton } from "./forms";
import { GuestButton } from "./GuestButton";
import type { RegisterForm } from "./useRegisterForm";

/** The registration screen, rendered from a {@link RegisterForm}. */
export function RegisterView({ form }: { form: RegisterForm }) {
  const { error, redirect } = form;
  return (
    <CardPage
      title="Create your account"
      subtitle="It takes a minute. Then pick a game."
      art="meeple"
    >
      <form onSubmit={form.submit} noValidate>
        <FormFields>
          <TextInput
            label="Username"
            description="Letters, numbers and underscores. Friends find you by this."
            value={form.username}
            onChange={form.setUsername}
            startIcon={IUser}
            status={fieldStatus(error, "username")}
            htmlName="username"
          />
          <TextInput
            label="Email"
            type="email"
            value={form.email}
            onChange={form.setEmail}
            startIcon={IMail}
            status={fieldStatus(error, "email")}
            htmlName="email"
          />
          <TextInput
            label="Password"
            description="At least 8 characters."
            type="password"
            value={form.password}
            onChange={form.setPassword}
            startIcon={ILock}
            status={fieldStatus(error, "password")}
            htmlName="password"
            {...autofill("new-password")}
          />
          <TextInput
            label="Confirm password"
            type="password"
            value={form.confirmPassword}
            onChange={form.setConfirmPassword}
            status={form.mismatch ?? fieldStatus(error, "confirmPassword")}
            htmlName="confirmPassword"
            {...autofill("new-password")}
          />
          <FormError error={error} />
          <Button
            type="submit"
            label="Create account"
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
      <GuestButton variant="ghost" icon={<IPlay />} width="100%" />
      <Text type="supporting" color="secondary" justify="center">
        Already have an account?{" "}
        <Link href={redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : "/login"}>
          Log in
        </Link>
      </Text>
    </CardPage>
  );
}
