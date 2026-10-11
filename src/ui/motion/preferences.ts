import { useSyncExternalStore } from "react";

/** Browser-local, never sent to the server (IMP-M12-10). */
export const CURSOR_EFFECTS_KEY = "turnbase.cursorEffects";
export const REDUCE_MOTION_KEY = "turnbase.reduceMotion";

export interface MotionPreferences {
  /** The pointer spotlight, tilt and parallax. On unless the person switched it off. */
  cursorEffects: boolean;
  /** Treat the page as `prefers-reduced-motion: reduce` even when the OS does not ask for it. */
  reduceMotion: boolean;
}

const DEFAULTS: MotionPreferences = { cursorEffects: true, reduceMotion: false };

function stored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** The stored choices; anything missing, invalid or unreadable is the default. */
export function readMotionPreferences(): MotionPreferences {
  return {
    cursorEffects: stored(CURSOR_EFFECTS_KEY) === "off" ? false : DEFAULTS.cursorEffects,
    reduceMotion: stored(REDUCE_MOTION_KEY) === "on" ? true : DEFAULTS.reduceMotion,
  };
}

/**
 * Mirrors the choices onto `<html>` so stylesheets can honour them the way they honour the media
 * query. Only a departure from the default leaves a mark.
 */
export function applyMotionAttributes({ cursorEffects, reduceMotion }: MotionPreferences): void {
  const root = document.documentElement;
  if (cursorEffects) root.removeAttribute("data-cursor-effects");
  else root.setAttribute("data-cursor-effects", "off");
  if (reduceMotion) root.setAttribute("data-reduce-motion", "true");
  else root.removeAttribute("data-reduce-motion");
}

// `useSyncExternalStore` needs the same object back while nothing changed.
let current: MotionPreferences | null = null;
// Set only while the browser refuses writes, so a choice still holds for this visit.
let unwritten: MotionPreferences | null = null;
const listeners = new Set<() => void>();

function snapshot(): MotionPreferences {
  const read = unwritten ?? readMotionPreferences();
  if (current?.cursorEffects === read.cursorEffects && current.reduceMotion === read.reduceMotion) {
    return current;
  }
  current = read;
  return read;
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  const onStorage = (event: StorageEvent) => {
    if (event.key === CURSOR_EFFECTS_KEY || event.key === REDUCE_MOTION_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function update(patch: Partial<MotionPreferences>): void {
  const next = { ...snapshot(), ...patch };
  try {
    localStorage.setItem(CURSOR_EFFECTS_KEY, next.cursorEffects ? "on" : "off");
    localStorage.setItem(REDUCE_MOTION_KEY, next.reduceMotion ? "on" : "off");
    unwritten = null;
  } catch {
    // Private window, blocked site data, quota — the choice still applies for this visit.
    unwritten = next;
  }
  applyMotionAttributes(next);
  listeners.forEach((listener) => {
    listener();
  });
}

/** Subscribe to {@link MotionPreferences}; the setters persist and apply at once. */
export function useMotionPreferences() {
  const prefs = useSyncExternalStore(subscribe, snapshot, () => DEFAULTS);
  return {
    ...prefs,
    setCursorEffects: (cursorEffects: boolean) => {
      update({ cursorEffects });
    },
    setReduceMotion: (reduceMotion: boolean) => {
      update({ reduceMotion });
    },
  };
}

export { subscribe as subscribeMotionPreferences };
