import { useEffect, useState, type SubmitEvent } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { AlertDialog } from "@astryxdesign/core/AlertDialog";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { List, ListItem } from "@astryxdesign/core/List";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Stack } from "@astryxdesign/core/Stack";
import { Switch } from "@astryxdesign/core/Switch";
import { Text } from "@astryxdesign/core/Text";
import { TextInput, type TextInputStatus } from "@astryxdesign/core/TextInput";
import { useToast } from "@astryxdesign/core/Toast";
import { ApiError } from "../../shared/api";
import { LoadError } from "../../shared/LoadError";
import { useAuth } from "../auth/auth-context";
import { FormError } from "../auth/forms";
import { fieldStatus } from "../auth/fieldStatus";
import {
  addPasswordMethod,
  changePassword,
  completeGoogleLink,
  deleteAccount,
  fetchAccount,
  removeAuthMethod,
  updateAccount,
  updatePrivacy,
} from "./settingsApi";
import type { AccountResponse, PrivacySettings } from "./settings-types";
import { autofill } from "../../shared/autofill";

/** VW-SET-001…007. */
export function SettingsPage() {
  const [account, setAccount] = useState<AccountResponse | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [params, setParams] = useSearchParams();
  const showToast = useToast();

  function reload() {
    fetchAccount()
      .then(setAccount)
      .catch(() => {
        setLoadFailed(true);
      });
  }

  useEffect(reload, []);

  // oauth-rest-api.md §7a step 3: confirm a Google link initiated from this page.
  useEffect(() => {
    if (params.get("linkGoogle") === "1") {
      completeGoogleLink()
        .then(() => {
          showToast({ type: "info", body: "Google account linked." });
          reload();
        })
        .catch(() => {
          showToast({
            type: "error",
            body: "Could not link your Google account. Please try again.",
          });
        })
        .finally(() => {
          setParams({}, { replace: true });
        });
    } else if (params.get("linkError") === "1") {
      showToast({ type: "error", body: "That Google account is already linked to an account." });
      setParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!account) {
    return (
      <Stack gap={2} padding={6}>
        <Heading level={1}>Account settings</Heading>
        {loadFailed ? (
          <LoadError
            message="Could not load your account settings."
            onRetry={() => {
              setLoadFailed(false);
              reload();
            }}
          />
        ) : (
          <Text>Loading…</Text>
        )}
      </Stack>
    );
  }

  return (
    <Stack gap={8} padding={6} maxWidth={560}>
      <Heading level={1}>Account settings</Heading>
      <AccountSection account={account} onUpdated={setAccount} onReload={reload} />
      <AuthMethodsSection account={account} onReload={reload} />
      <PrivacySection
        privacy={account.privacy}
        onUpdated={(privacy) => {
          setAccount({ ...account, privacy });
        }}
      />
      <DeleteAccountSection />
    </Stack>
  );
}

function AccountSection({
  account,
  onUpdated,
  onReload,
}: {
  account: AccountResponse;
  onUpdated: (account: AccountResponse) => void;
  onReload: () => void;
}) {
  return (
    <Stack gap={3}>
      <Heading level={2}>Profile identity</Heading>
      <IdentityForm field="username" account={account} onUpdated={onUpdated} />
      {/* VW-SET-002: an address bound to an OAuth provider is not editable, so the form is absent. */}
      {account.emailSource !== "OAUTH" && (
        <IdentityForm field="email" account={account} onUpdated={onUpdated} />
      )}
      <PasswordSection account={account} onReload={onReload} />
    </Stack>
  );
}

/** VW-SET-001 / VW-SET-002: one field, one form, so each saves (and fails) on its own. */
function IdentityForm({
  field,
  account,
  onUpdated,
}: {
  field: "username" | "email";
  account: AccountResponse;
  onUpdated: (account: AccountResponse) => void;
}) {
  const { principal, acceptPrincipal } = useAuth();
  const showToast = useToast();
  const [value, setValue] = useState(account[field]);
  const [error, setError] = useState<unknown>(null);
  const [isBusy, setIsBusy] = useState(false);

  const label = field === "username" ? "Username" : "Email";
  const lockedUntil =
    field === "username" ? account.usernameChangeableAt : account.emailChangeableAt;
  const isLocked = lockedUntil !== null;

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (value === account[field]) return;
    setIsBusy(true);
    setError(null);
    // The PATCH answers with the identity alone, so the account is read again for the new
    // `*ChangeableAt` window (rest-conventions.md, *The account representation*).
    updateAccount({ [field]: value })
      .then(fetchAccount)
      .then((updated) => {
        onUpdated(updated);
        if (field === "username" && principal) {
          acceptPrincipal({ ...principal, username: value });
        }
        showToast({ type: "info", body: `${label} updated.` });
      })
      .catch(setError)
      .finally(() => {
        setIsBusy(false);
      });
  }

  return (
    <form onSubmit={submit} noValidate>
      <Stack gap={3}>
        <TextInput
          label={label}
          type={field === "email" ? "email" : undefined}
          value={value}
          onChange={setValue}
          status={fieldStatus(error, field)}
          htmlName={field}
          isDisabled={isLocked}
          disabledMessage={
            isLocked
              ? `You can change your ${field} again on ${new Date(lockedUntil).toLocaleDateString()}.`
              : undefined
          }
          isRequired
        />
        <FormError error={error} />
        {!isLocked && (
          <Button type="submit" label={`Save ${field}`} variant="primary" isLoading={isBusy} />
        )}
      </Stack>
    </form>
  );
}

function PasswordSection({
  account,
  onReload,
}: {
  account: AccountResponse;
  onReload: () => void;
}) {
  const showToast = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [isBusy, setIsBusy] = useState(false);

  const mismatch: TextInputStatus | undefined =
    confirmNewPassword && confirmNewPassword !== newPassword
      ? { type: "error", message: "Passwords do not match." }
      : undefined;

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mismatch) return;
    setIsBusy(true);
    setError(null);
    changePassword({ currentPassword, newPassword, confirmNewPassword })
      .then(() => {
        showToast({ type: "info", body: "Password changed." });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
      })
      .catch((failure: unknown) => {
        setError(failure);
      })
      .finally(() => {
        setIsBusy(false);
      });
  }

  if (!account.authMethods.includes("PASSWORD")) return <AddPasswordForm onAdded={onReload} />;

  return (
    <Stack gap={3}>
      <Heading level={3}>Change password</Heading>
      <form onSubmit={submit} noValidate>
        <Stack gap={3}>
          <TextInput
            label="Current password"
            type="password"
            value={currentPassword}
            onChange={setCurrentPassword}
            status={fieldStatus(error, "currentPassword")}
            htmlName="currentPassword"
            {...autofill("current-password")}
            isRequired
          />
          <TextInput
            label="New password"
            type="password"
            value={newPassword}
            onChange={setNewPassword}
            status={fieldStatus(error, "newPassword")}
            htmlName="newPassword"
            {...autofill("new-password")}
            isRequired
          />
          <TextInput
            label="Confirm new password"
            type="password"
            value={confirmNewPassword}
            onChange={setConfirmNewPassword}
            status={mismatch ?? fieldStatus(error, "confirmNewPassword")}
            htmlName="confirmNewPassword"
            {...autofill("new-password")}
            isRequired
          />
          <FormError error={error} unauthorizedMessage="Your current password is incorrect." />
          <Button type="submit" label="Change password" variant="primary" isLoading={isBusy} />
        </Stack>
      </form>
    </Stack>
  );
}

function AddPasswordForm({ onAdded }: { onAdded: () => void }) {
  const showToast = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [isBusy, setIsBusy] = useState(false);

  const mismatch: TextInputStatus | undefined =
    confirmPassword && confirmPassword !== password
      ? { type: "error", message: "Passwords do not match." }
      : undefined;

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mismatch) return;
    setIsBusy(true);
    setError(null);
    addPasswordMethod(password, confirmPassword)
      .then(() => {
        showToast({ type: "info", body: "Password sign-in added." });
        setPassword("");
        setConfirmPassword("");
        onAdded();
      })
      .catch((failure: unknown) => {
        setError(failure);
      })
      .finally(() => {
        setIsBusy(false);
      });
  }

  return (
    <Stack gap={3}>
      <Heading level={3}>Add a password</Heading>
      <Text>Your account currently signs in with Google only.</Text>
      <form onSubmit={submit} noValidate>
        <Stack gap={3}>
          <TextInput
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            status={fieldStatus(error, "password")}
            htmlName="password"
            {...autofill("new-password")}
            isRequired
          />
          <TextInput
            label="Confirm password"
            type="password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            status={mismatch ?? fieldStatus(error, "confirmPassword")}
            htmlName="confirmPassword"
            {...autofill("new-password")}
            isRequired
          />
          <FormError error={error} />
          <Button type="submit" label="Add password" variant="primary" isLoading={isBusy} />
        </Stack>
      </form>
    </Stack>
  );
}

function AuthMethodsSection({
  account,
  onReload,
}: {
  account: AccountResponse;
  onReload: () => void;
}) {
  const showToast = useToast();
  const [isBusy, setIsBusy] = useState(false);

  function remove(method: "PASSWORD" | "GOOGLE") {
    setIsBusy(true);
    removeAuthMethod(method)
      .then(() => {
        showToast({ type: "info", body: "Sign-in method removed." });
        onReload();
      })
      .catch((failure: unknown) => {
        const message =
          failure instanceof ApiError && failure.status === 422
            ? "You cannot remove your only sign-in method."
            : "Could not remove that sign-in method. Please try again.";
        showToast({ type: "error", body: message });
      })
      .finally(() => {
        setIsBusy(false);
      });
  }

  const canRemove = account.authMethods.length > 1;

  return (
    <Stack gap={3}>
      <Heading level={2}>Sign-in methods</Heading>
      <List header="Sign-in methods">
        {account.authMethods.map((method) => (
          <ListItem
            key={method}
            label={method === "PASSWORD" ? "Password" : "Google"}
            endContent={
              canRemove ? (
                <Button
                  label="Remove"
                  aria-label={`Remove ${method === "PASSWORD" ? "Password" : "Google"}`}
                  variant="ghost"
                  isLoading={isBusy}
                  onClick={() => {
                    remove(method);
                  }}
                />
              ) : undefined
            }
          />
        ))}
      </List>
      {!account.authMethods.includes("GOOGLE") && (
        <Button
          as="a"
          href="/auth/google?intent=link"
          label="Link Google account"
          variant="secondary"
        />
      )}
    </Stack>
  );
}

function PrivacySection({
  privacy,
  onUpdated,
}: {
  privacy: PrivacySettings;
  onUpdated: (privacy: PrivacySettings) => void;
}) {
  const showToast = useToast();
  const [isBusy, setIsBusy] = useState(false);

  function save(fields: Partial<PrivacySettings>) {
    setIsBusy(true);
    updatePrivacy(fields)
      .then((saved) => {
        onUpdated(saved);
        showToast({ type: "info", body: "Privacy settings saved." });
      })
      .catch(() => {
        showToast({ type: "error", body: "Could not save that setting. Please try again." });
      })
      .finally(() => {
        setIsBusy(false);
      });
  }

  return (
    <Stack gap={3}>
      <Heading level={2}>Privacy</Heading>
      <Switch
        label="Make my profile private"
        description="A private profile hides every section from everyone but you."
        value={privacy.profilePrivate}
        isLoading={isBusy}
        changeAction={(checked) => {
          save({ profilePrivate: checked });
        }}
      />
      {!privacy.profilePrivate && (
        <Stack gap={3}>
          <SegmentedControl
            label="Game history visibility"
            value={privacy.historyVisibility}
            onChange={(value) => {
              save({ historyVisibility: value as PrivacySettings["historyVisibility"] });
            }}
          >
            <SegmentedControlItem value="PUBLIC" label="Public" />
            <SegmentedControlItem value="HIDDEN" label="Hidden" />
          </SegmentedControl>
          <SegmentedControl
            label="Statistics visibility"
            value={privacy.statsVisibility}
            onChange={(value) => {
              save({ statsVisibility: value as PrivacySettings["statsVisibility"] });
            }}
          >
            <SegmentedControlItem value="PUBLIC" label="Public" />
            <SegmentedControlItem value="HIDDEN" label="Hidden" />
          </SegmentedControl>
          <SegmentedControl
            label="Uploaded games visibility"
            value={privacy.gamesVisibility}
            onChange={(value) => {
              save({ gamesVisibility: value as PrivacySettings["gamesVisibility"] });
            }}
          >
            <SegmentedControlItem value="PUBLIC" label="Public" />
            <SegmentedControlItem value="HIDDEN" label="Hidden" />
          </SegmentedControl>
          <SegmentedControl
            label="Friends list visibility"
            value={privacy.friendsVisibility}
            onChange={(value) => {
              save({ friendsVisibility: value as PrivacySettings["friendsVisibility"] });
            }}
          >
            <SegmentedControlItem value="PUBLIC" label="Public" />
            <SegmentedControlItem value="FRIENDS_ONLY" label="Friends only" />
            <SegmentedControlItem value="HIDDEN" label="Hidden" />
          </SegmentedControl>
        </Stack>
      )}
      <Switch
        label="Block friend requests"
        value={privacy.blockFriendRequests}
        isLoading={isBusy}
        changeAction={(checked) => {
          save({ blockFriendRequests: checked });
        }}
      />
    </Stack>
  );
}

function DeleteAccountSection() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const showToast = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  function confirmDelete() {
    setIsBusy(true);
    deleteAccount()
      .then(() => {
        void navigate("/", { replace: true });
      })
      .then(() => logout())
      .catch(() => {
        showToast({ type: "error", body: "Could not delete your account. Please try again." });
        setIsBusy(false);
        setIsOpen(false);
      });
  }

  return (
    <Stack gap={3}>
      <Heading level={2}>Delete account</Heading>
      <Banner status="warning" title="Deleting your account cannot be undone." />
      <Button
        label="Delete my account"
        variant="destructive"
        onClick={() => {
          setIsOpen(true);
        }}
      />
      <AlertDialog
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        title="Delete your account?"
        description="This permanently deletes your account, profile and game history. This cannot be undone."
        actionLabel="Delete account"
        isActionLoading={isBusy}
        onAction={confirmDelete}
      />
    </Stack>
  );
}
