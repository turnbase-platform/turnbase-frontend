import { useState } from "react";
import { useToast } from "@astryxdesign/core/Toast";
import { updatePrivacy } from "./settingsApi";
import type { PrivacySettings } from "./settings-types";

/** VW-SET-006 / VW-SET-006a: every change is saved on its own, as it is made. */
export function usePrivacy(
  privacy: PrivacySettings,
  onUpdated: (privacy: PrivacySettings) => void,
) {
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

  return { privacy, isBusy, save };
}

export type Privacy = ReturnType<typeof usePrivacy>;
