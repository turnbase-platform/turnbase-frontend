import { createContext, useContext } from "react";

/** `system` follows the operating system; it is the default and means "no forced scheme". */
export type Appearance = "light" | "dark" | "system";

export const APPEARANCE_KEY = "turnbase.appearance";

const VALUES: readonly Appearance[] = ["light", "dark", "system"];

/** The stored choice, or `system` when nothing valid is stored or storage is unavailable. */
export function readAppearance(): Appearance {
  try {
    const stored = localStorage.getItem(APPEARANCE_KEY);
    return VALUES.find((v) => v === stored) ?? "system";
  } catch {
    return "system";
  }
}

/** Best effort: a blocked or full store loses the preference, never the page. */
export function writeAppearance(value: Appearance): void {
  try {
    localStorage.setItem(APPEARANCE_KEY, value);
  } catch {
    // Private window, blocked site data, quota — the choice still applies for this visit.
  }
}

export interface AppearanceState {
  appearance: Appearance;
  setAppearance: (value: Appearance) => void;
}

export const AppearanceContext = createContext<AppearanceState | null>(null);

export function useAppearance(): AppearanceState {
  const state = useContext(AppearanceContext);
  if (!state) throw new Error("useAppearance must be used inside <AppearanceProvider>");
  return state;
}
