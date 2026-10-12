import { AlertDialog } from "@astryxdesign/core/AlertDialog";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Stack } from "@astryxdesign/core/Stack";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Row } from "../../ui";
import { autofill } from "../../shared/autofill";
import type { DeleteAccount } from "./useDeleteAccount";

export function DeleteAccountView({ account }: { account: DeleteAccount }) {
  const { needsPassword, password } = account;
  return (
    <Stack gap={3}>
      <Banner status="warning" title="Deleting your account cannot be undone." />
      {needsPassword && (
        <TextInput
          label="Confirm with your password"
          type="password"
          value={password}
          onChange={account.setPassword}
          htmlName="deleteAccountPassword"
          {...autofill("current-password")}
        />
      )}
      <Row>
        <Button
          label="Delete my account"
          variant="destructive"
          isDisabled={needsPassword && password === ""}
          onClick={() => {
            account.setIsOpen(true);
          }}
        />
      </Row>
      <AlertDialog
        isOpen={account.isOpen}
        onOpenChange={account.setIsOpen}
        title="Delete your account?"
        description="This permanently deletes your account, profile and game history. This cannot be undone."
        actionLabel="Delete account"
        isActionLoading={account.isBusy}
        onAction={account.confirm}
      />
    </Stack>
  );
}
