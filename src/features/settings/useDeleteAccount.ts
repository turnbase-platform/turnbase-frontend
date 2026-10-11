import { useState } from "react";
import { useNavigate } from "react-router";
import { useToast } from "@astryxdesign/core/Toast";
import { ApiError } from "../../shared/api";
import { useAuth } from "../auth/auth-context";
import { deleteAccount } from "./settingsApi";

/** VW-SET-007 / FR-ACCT-004: opening the dialog asks; only confirming deletes. */
export function useDeleteAccount(needsPassword: boolean) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const showToast = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [password, setPassword] = useState("");

  function confirm() {
    setIsBusy(true);
    deleteAccount(needsPassword ? password : undefined)
      .then(() => {
        void navigate("/", { replace: true });
      })
      .then(() => logout())
      .catch((failure: unknown) => {
        showToast({
          type: "error",
          body:
            failure instanceof ApiError && failure.status === 422
              ? "That password is incorrect."
              : "Could not delete your account. Please try again.",
        });
        setIsBusy(false);
        setIsOpen(false);
      });
  }

  return { needsPassword, password, setPassword, isOpen, setIsOpen, isBusy, confirm };
}

export type DeleteAccount = ReturnType<typeof useDeleteAccount>;
