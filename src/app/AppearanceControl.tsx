import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { useAppearance, type Appearance } from "./appearance";

const OPTIONS: readonly { value: Appearance; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "Auto" },
];

/** Light / Dark / Auto switch for the shell (ADR-0017 §1). */
export function AppearanceControl() {
  const { appearance, setAppearance } = useAppearance();
  return (
    <SegmentedControl
      label="Appearance"
      size="sm"
      value={appearance}
      onChange={(value) => {
        setAppearance(value as Appearance);
      }}
    >
      {OPTIONS.map((o) => (
        <SegmentedControlItem key={o.value} value={o.value} label={o.label} />
      ))}
    </SegmentedControl>
  );
}
