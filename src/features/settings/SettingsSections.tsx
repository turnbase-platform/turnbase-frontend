import { Stack } from "@astryxdesign/core/Stack";
import { SectionCard } from "../../ui";
import { AppearanceView } from "./AppearanceView";
import { AuthMethodsView } from "./AuthMethodsView";
import { DeleteAccountView } from "./DeleteAccountView";
import { IdentityFormView } from "./IdentityFormView";
import { AddPasswordView, ChangePasswordView } from "./PasswordFormViews";
import { PrivacyView } from "./PrivacyView";
import type { AccountResponse, PrivacySettings } from "./settings-types";
import { useAppearanceSettings } from "./useAppearanceSettings";
import { useAuthMethods } from "./useAuthMethods";
import { useDeleteAccount } from "./useDeleteAccount";
import { useIdentityForm, type IdentityField } from "./useIdentityForm";
import { useAddPassword, useChangePassword } from "./usePasswordForms";
import { usePrivacy } from "./usePrivacy";

/** The connectors: each hands one hook's state to the view that draws it. */

function Identity({
  field,
  account,
  onUpdated,
}: {
  field: IdentityField;
  account: AccountResponse;
  onUpdated: (account: AccountResponse) => void;
}) {
  return <IdentityFormView form={useIdentityForm(field, account, onUpdated)} />;
}

function ChangePassword() {
  return <ChangePasswordView form={useChangePassword()} />;
}

function AddPassword({ onAdded }: { onAdded: () => void }) {
  return <AddPasswordView form={useAddPassword(onAdded)} />;
}

export function AccountSection({
  account,
  onUpdated,
  onReload,
}: {
  account: AccountResponse;
  onUpdated: (account: AccountResponse) => void;
  onReload: () => void;
}) {
  return (
    <Stack gap={4}>
      <SectionCard title="Profile identity">
        <Identity field="username" account={account} onUpdated={onUpdated} />
        {/* VW-SET-002: an address bound to an OAuth provider is not editable, so the form is absent. */}
        {account.emailSource !== "OAUTH" && (
          <Identity field="email" account={account} onUpdated={onUpdated} />
        )}
      </SectionCard>
      <SectionCard title="Password">
        {account.authMethods.includes("PASSWORD") ? (
          <ChangePassword />
        ) : (
          <AddPassword onAdded={onReload} />
        )}
      </SectionCard>
    </Stack>
  );
}

export function SignInSection({
  account,
  onReload,
}: {
  account: AccountResponse;
  onReload: () => void;
}) {
  return (
    <SectionCard title="Sign-in methods">
      <AuthMethodsView auth={useAuthMethods(account, onReload)} />
    </SectionCard>
  );
}

export function PrivacySection({
  privacy,
  onUpdated,
}: {
  privacy: PrivacySettings;
  onUpdated: (privacy: PrivacySettings) => void;
}) {
  return (
    <SectionCard title="Privacy">
      <PrivacyView privacy={usePrivacy(privacy, onUpdated)} />
    </SectionCard>
  );
}

export function AppearanceSection() {
  return (
    <SectionCard title="Appearance">
      <AppearanceView settings={useAppearanceSettings()} />
    </SectionCard>
  );
}

export function DeleteAccountSection({ needsPassword }: { needsPassword: boolean }) {
  return (
    <SectionCard title="Delete account">
      <DeleteAccountView account={useDeleteAccount(needsPassword)} />
    </SectionCard>
  );
}
