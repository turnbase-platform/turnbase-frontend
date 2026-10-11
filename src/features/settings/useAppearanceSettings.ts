import { useAppearance } from "../../app/appearance";
import { useMotionPreferences } from "../../ui";

/** FR-THM-001: how the site looks and moves. Browser-local; nothing here is sent to the server. */
export function useAppearanceSettings() {
  const { appearance, setAppearance } = useAppearance();
  const { cursorEffects, reduceMotion, setCursorEffects, setReduceMotion } = useMotionPreferences();
  return {
    appearance,
    setAppearance,
    cursorEffects,
    reduceMotion,
    setCursorEffects,
    setReduceMotion,
  };
}

export type AppearanceSettings = ReturnType<typeof useAppearanceSettings>;
