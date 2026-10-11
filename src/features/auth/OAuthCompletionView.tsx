import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Link } from "@astryxdesign/core/Link";
import { TextInput } from "@astryxdesign/core/TextInput";
import { IMail, IUser } from "../../ui";
import { AuthLayout, FormFields } from "./AuthLayout";
import { fieldStatus } from "./fieldStatus";
import { FormError } from "./forms";
import type { OAuthCompletion } from "./useOAuthCompletion";

/** The username step after Google sign-in, rendered from an {@link OAuthCompletion}. */
export function OAuthCompletionView({ form }: { form: OAuthCompletion }) {
  return (
    <AuthLayout title="Choose a username" subtitle="One last step to finish your account.">
      {form.collision && (
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
      <form onSubmit={form.submit} noValidate>
        <FormFields>
          <TextInput
            label="Email"
            value={form.email}
            startIcon={IMail}
            isReadOnly
            htmlName="email"
          />
          <TextInput
            label="Username"
            value={form.username}
            onChange={form.setUsername}
            startIcon={IUser}
            status={fieldStatus(form.error, "username")}
            htmlName="username"
            isRequired
          />
          <FormError error={form.error} />
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
    </AuthLayout>
  );
}
