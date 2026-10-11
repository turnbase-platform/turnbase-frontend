import { Button } from "@astryxdesign/core/Button";
import { Stack } from "@astryxdesign/core/Stack";
import { TextInput } from "@astryxdesign/core/TextInput";
import { autofill } from "../../shared/autofill";
import { fieldStatus } from "../auth/fieldStatus";
import { FormError } from "../auth/forms";
import type { IdentityForm } from "./useIdentityForm";

export function IdentityFormView({ form }: { form: IdentityForm }) {
  const { field, label, lockedUntil, needsPassword } = form;
  const isLocked = lockedUntil !== null;
  return (
    <form onSubmit={form.submit} noValidate>
      <Stack gap={3}>
        <TextInput
          label={label}
          type={field === "email" ? "email" : undefined}
          value={form.value}
          onChange={form.setValue}
          status={fieldStatus(form.error, field)}
          htmlName={field}
          isDisabled={isLocked}
          disabledMessage={
            isLocked
              ? `You can change your ${field} again on ${new Date(lockedUntil).toLocaleDateString()}.`
              : undefined
          }
          isRequired
        />
        {needsPassword && !isLocked && (
          <TextInput
            label="Confirm with your password"
            type="password"
            value={form.confirmPassword}
            onChange={form.setConfirmPassword}
            htmlName="emailCurrentPassword"
            {...autofill("current-password")}
            isRequired
          />
        )}
        <FormError error={form.error} />
        {!isLocked && (
          <Button type="submit" label={`Save ${field}`} variant="primary" isLoading={form.isBusy} />
        )}
      </Stack>
    </form>
  );
}
