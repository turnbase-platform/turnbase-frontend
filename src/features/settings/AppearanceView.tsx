import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Stack } from "@astryxdesign/core/Stack";
import { Switch } from "@astryxdesign/core/Switch";
import { Text } from "@astryxdesign/core/Text";
import type { Appearance } from "../../app/appearance";
import type { AppearanceSettings } from "./useAppearanceSettings";

const THEMES: readonly { value: Appearance; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "Auto" },
];

export function AppearanceView({ settings }: { settings: AppearanceSettings }) {
  return (
    <Stack gap={3}>
      <Stack gap={1}>
        <Text>Theme</Text>
        <SegmentedControl
          label="Theme"
          value={settings.appearance}
          onChange={(value) => {
            settings.setAppearance(value as Appearance);
          }}
        >
          {THEMES.map(({ value, label }) => (
            <SegmentedControlItem key={value} value={value} label={label} />
          ))}
        </SegmentedControl>
        <Text color="secondary">Auto follows your device.</Text>
      </Stack>
      <Switch
        label="Cursor effects"
        description="A spotlight and tilt that follow the pointer."
        value={settings.cursorEffects}
        changeAction={(checked) => {
          settings.setCursorEffects(checked);
        }}
      />
      <Switch
        label="Reduce motion"
        description="Stops the animated background and transitions, whatever your device asks for."
        value={settings.reduceMotion}
        changeAction={(checked) => {
          settings.setReduceMotion(checked);
        }}
      />
      <Text color="secondary">These choices are saved in this browser only.</Text>
    </Stack>
  );
}
