import { useState } from "react";
import { useToast } from "@astryxdesign/core/Toast";
import { ApiError } from "../../shared/api";
import { useGoogleAvailable } from "../auth/useGoogleAvailable";
import { removeAuthMethod } from "./settingsApi";
import type { AccountResponse } from "./settings-types";

type Method = AccountResponse["authMethods"][number];

/** VW-SET-004 / VW-SET-005: the sign-in methods on the account, and removing one. */
export function useAuthMethods(account: AccountResponse, onReload: () => void) {
  const showToast = useToast();
  const googleAvailable = useGoogleAvailable();
  const [isBusy, setIsBusy] = useState(false);

  function remove(method: Method) {
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

  return {
    methods: account.authMethods,
    canRemove: account.authMethods.length > 1,
    canLinkGoogle: googleAvailable && !account.authMethods.includes("GOOGLE"),
    isBusy,
    remove,
  };
}

export type AuthMethods = ReturnType<typeof useAuthMethods>;
