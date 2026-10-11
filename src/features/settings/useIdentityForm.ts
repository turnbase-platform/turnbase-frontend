import { useState, type SubmitEvent } from "react";
import { useToast } from "@astryxdesign/core/Toast";
import { useAuth } from "../auth/auth-context";
import { fetchAccount, updateAccount } from "./settingsApi";
import type { AccountResponse } from "./settings-types";

export type IdentityField = "username" | "email";

/** VW-SET-001 / VW-SET-002: one field, one form, so each saves (and fails) on its own. */
export function useIdentityForm(
  field: IdentityField,
  account: AccountResponse,
  onUpdated: (account: AccountResponse) => void,
) {
  const { principal, acceptPrincipal } = useAuth();
  const showToast = useToast();
  const [value, setValue] = useState(account[field]);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [isBusy, setIsBusy] = useState(false);

  // An email change is permanent, so a credential account proves the current password (IMP-GATE-99).
  const needsPassword = field === "email" && account.authMethods.includes("PASSWORD");
  const label = field === "username" ? "Username" : "Email";
  const lockedUntil =
    field === "username" ? account.usernameChangeableAt : account.emailChangeableAt;

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (value === account[field]) return;
    setIsBusy(true);
    setError(null);
    // The PATCH answers with the identity alone, so the account is read again for the new
    // `*ChangeableAt` window (rest-conventions.md, *The account representation*).
    updateAccount({
      [field]: value,
      ...(needsPassword ? { currentPassword: confirmPassword } : {}),
    })
      .then(fetchAccount)
      .then((updated) => {
        onUpdated(updated);
        if (field === "username" && principal) {
          acceptPrincipal({ ...principal, username: value });
        }
        setConfirmPassword("");
        showToast({ type: "info", body: `${label} updated.` });
      })
      .catch(setError)
      .finally(() => {
        setIsBusy(false);
      });
  }

  return {
    field,
    label,
    value,
    setValue,
    confirmPassword,
    setConfirmPassword,
    needsPassword,
    lockedUntil,
    error,
    isBusy,
    submit,
  };
}

export type IdentityForm = ReturnType<typeof useIdentityForm>;
