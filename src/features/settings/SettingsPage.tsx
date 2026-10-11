import { Heading } from "@astryxdesign/core/Heading";
import { Stack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { LoadError } from "../../shared/LoadError";
import { SettingsView } from "./SettingsView";
import { useAccountSettings } from "./useAccountSettings";

/** VW-SET-001…007. */
export function SettingsPage() {
  const settings = useAccountSettings();
  const { account } = settings;

  if (!account) {
    return (
      <Stack gap={2} padding={6}>
        <Heading level={1}>Account settings</Heading>
        {settings.loadFailed ? (
          <LoadError message="Could not load your account settings." onRetry={settings.retry} />
        ) : (
          <Text>Loading…</Text>
        )}
      </Stack>
    );
  }

  return (
    <SettingsView
      account={account}
      initialTab={settings.returnedFromGoogle ? "sign-in" : "account"}
      onAccountChanged={settings.setAccount}
      onPrivacyChanged={settings.setPrivacy}
      onReload={settings.reload}
    />
  );
}
