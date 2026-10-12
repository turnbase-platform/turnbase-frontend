import { useState } from "react";
import { PageHead, Pane, PillTabs } from "../../ui";
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
      <PageHead
        title="Settings"
        subtitle="Your account and how TurnBase looks and behaves for you."
      />
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
        <Pane id={tab}>
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
        </Pane>
      </div>
    </div>
  );
}
