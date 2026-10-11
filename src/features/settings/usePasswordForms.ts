import { useState, type SubmitEvent } from "react";
import { useToast } from "@astryxdesign/core/Toast";
import type { TextInputStatus } from "@astryxdesign/core/TextInput";
import { addPasswordMethod, changePassword } from "./settingsApi";

function mismatchOf(confirm: string, password: string): TextInputStatus | undefined {
  return confirm && confirm !== password
    ? { type: "error", message: "Passwords do not match." }
    : undefined;
}

/** VW-SET-003: change the password of an account that has one. */
export function useChangePassword() {
  const showToast = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [isBusy, setIsBusy] = useState(false);
  const mismatch = mismatchOf(confirmNewPassword, newPassword);

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

  return {
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmNewPassword,
    setConfirmNewPassword,
    mismatch,
    error,
    isBusy,
    submit,
  };
}

export type ChangePasswordForm = ReturnType<typeof useChangePassword>;

/** VW-SET-004: give a Google-only account a password sign-in. */
export function useAddPassword(onAdded: () => void) {
  const showToast = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [isBusy, setIsBusy] = useState(false);
  const mismatch = mismatchOf(confirmPassword, password);

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

  return {
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    mismatch,
    error,
    isBusy,
    submit,
  };
}

export type AddPasswordForm = ReturnType<typeof useAddPassword>;
