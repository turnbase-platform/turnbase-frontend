import { DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@astryxdesign/core/DropdownMenu";
import { useAppearance, type Appearance } from "./appearance";

const OPTIONS: readonly { value: Appearance; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "Auto" },
];

/**
 * Light / Dark / Auto as the account menu's radio group. The prototype keeps this switch in a dock
 * that is not product (ADR-0017 §5); the menu is the one place every signed-in tier has.
 */
export function AppearanceMenuGroup() {
  const { appearance, setAppearance } = useAppearance();
  return (
    <DropdownMenuRadioGroup
      label="Appearance"
      value={appearance}
      onChange={(value) => {
        setAppearance(value as Appearance);
      }}
    >
      {OPTIONS.map((o) => (
        <DropdownMenuRadioItem key={o.value} value={o.value} label={o.label} />
      ))}
    </DropdownMenuRadioGroup>
  );
}
