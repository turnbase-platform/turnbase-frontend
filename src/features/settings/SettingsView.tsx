import { useState } from "react";
import { Heading } from "@astryxdesign/core/Heading";
import { PillTabs } from "../../ui";
import type { AccountResponse, PrivacySettings } from "./settings-types";
import {
  AccountSection,
  AppearanceSection,
  DeleteAccountSection,
  PrivacySection,
  SignInSection,
} from "./SettingsSections";
import styles from "./SettingsView.module.css";

const SETTINGS_TABS = [
  { value: "account", label: "Account" },
  { value: "sign-in", label: "Sign-in" },
  { value: "privacy", label: "Privacy" },
  { value: "appearance", label: "Appearance" },
  { value: "delete", label: "Delete account" },
] as const;

export type SettingsTab = (typeof SETTINGS_TABS)[number]["value"];

const PANEL = "settings-panel";

/** VW-SET-001…007: one tab per concern, one panel on screen at a time. */
export function SettingsView({
  account,
  initialTab = "account",
  onAccountChanged,
  onPrivacyChanged,
  onReload,
}: {
  account: AccountResponse;
  initialTab?: SettingsTab;
  onAccountChanged: (account: AccountResponse) => void;
  onPrivacyChanged: (privacy: PrivacySettings) => void;
  onReload: () => void;
}) {
  const [tab, setTab] = useState<SettingsTab>(initialTab);
  const label = SETTINGS_TABS.find((t) => t.value === tab)?.label;
  return (
    <div className={styles.page}>
      <Heading level={1} type="display-2">
        Account settings
      </Heading>
      <PillTabs
        label="Settings sections"
        value={tab}
        items={SETTINGS_TABS}
        panelId={PANEL}
        onChange={(value) => {
          setTab(value as SettingsTab);
        }}
      />
      <div id={PANEL} role="tabpanel" aria-label={label} className={styles.panel}>
        {tab === "account" && (
          <AccountSection account={account} onUpdated={onAccountChanged} onReload={onReload} />
        )}
        {tab === "sign-in" && <SignInSection account={account} onReload={onReload} />}
        {tab === "privacy" && (
          <PrivacySection privacy={account.privacy} onUpdated={onPrivacyChanged} />
        )}
        {tab === "appearance" && <AppearanceSection />}
        {tab === "delete" && (
          <DeleteAccountSection needsPassword={account.authMethods.includes("PASSWORD")} />
        )}
      </div>
    </div>
  );
}
