import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { Stack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { autofill } from "../../shared/autofill";
import { fieldStatus } from "../auth/fieldStatus";
import { FormError } from "../auth/forms";
import type { AddPasswordForm, ChangePasswordForm } from "./usePasswordForms";

export function ChangePasswordView({ form }: { form: ChangePasswordForm }) {
  return (
    <Stack gap={3}>
      <Heading level={3}>Change password</Heading>
      <form onSubmit={form.submit} noValidate>
        <Stack gap={3}>
          <TextInput
            label="Current password"
            type="password"
            value={form.currentPassword}
            onChange={form.setCurrentPassword}
            status={fieldStatus(form.error, "currentPassword")}
            htmlName="currentPassword"
            {...autofill("current-password")}
            isRequired
          />
          <TextInput
            label="New password"
            type="password"
            value={form.newPassword}
            onChange={form.setNewPassword}
            status={fieldStatus(form.error, "newPassword")}
            htmlName="newPassword"
            {...autofill("new-password")}
            isRequired
          />
          <TextInput
            label="Confirm new password"
            type="password"
            value={form.confirmNewPassword}
            onChange={form.setConfirmNewPassword}
            status={form.mismatch ?? fieldStatus(form.error, "confirmNewPassword")}
            htmlName="confirmNewPassword"
            {...autofill("new-password")}
            isRequired
          />
          <FormError error={form.error} unauthorizedMessage="Your current password is incorrect." />
          <Button type="submit" label="Change password" variant="primary" isLoading={form.isBusy} />
        </Stack>
      </form>
    </Stack>
  );
}

export function AddPasswordView({ form }: { form: AddPasswordForm }) {
  return (
    <Stack gap={3}>
      <Heading level={3}>Add a password</Heading>
      <Text>Your account currently signs in with Google only.</Text>
      <form onSubmit={form.submit} noValidate>
        <Stack gap={3}>
          <TextInput
            label="Password"
            type="password"
            value={form.password}
            onChange={form.setPassword}
            status={fieldStatus(form.error, "password")}
            htmlName="password"
            {...autofill("new-password")}
            isRequired
          />
          <TextInput
            label="Confirm password"
            type="password"
            value={form.confirmPassword}
            onChange={form.setConfirmPassword}
            status={form.mismatch ?? fieldStatus(form.error, "confirmPassword")}
            htmlName="confirmPassword"
            {...autofill("new-password")}
            isRequired
          />
          <FormError error={form.error} />
          <Button type="submit" label="Add password" variant="primary" isLoading={form.isBusy} />
        </Stack>
      </form>
    </Stack>
  );
}
