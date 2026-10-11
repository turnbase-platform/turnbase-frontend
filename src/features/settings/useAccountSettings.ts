import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { useToast } from "@astryxdesign/core/Toast";
import { completeGoogleLink, fetchAccount } from "./settingsApi";
import type { AccountResponse, PrivacySettings } from "./settings-types";

/** Loads the account the settings tabs edit, and finishes a Google link the page was sent back from. */
export function useAccountSettings() {
  const [account, setAccount] = useState<AccountResponse | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [params, setParams] = useSearchParams();
  const [returnedFromGoogle] = useState(
    () => params.get("linkGoogle") === "1" || params.get("linkError") === "1",
  );
  const showToast = useToast();

  const reload = useCallback(() => {
    fetchAccount()
      .then(setAccount)
      .catch(() => {
        setLoadFailed(true);
      });
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

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
    // Once, for the redirect that brought the person here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    account,
    loadFailed,
    /** The page was reached from the Google link round trip, so the sign-in tab has the news. */
    returnedFromGoogle,
    reload,
    retry: () => {
      setLoadFailed(false);
      reload();
    },
    setAccount,
    setPrivacy: (privacy: PrivacySettings) => {
      setAccount((current) => (current ? { ...current, privacy } : current));
    },
  };
}

export type AccountSettings = ReturnType<typeof useAccountSettings>;
