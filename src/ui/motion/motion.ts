import { useSyncExternalStore } from "react";
import { readMotionPreferences, subscribeMotionPreferences } from "./preferences";

const QUERY = "(prefers-reduced-motion: reduce)";

/**
 * True when the visitor asked the OS for less motion, or switched Reduced motion on in Settings.
 * Every effect in `ui/` asks this first.
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia(QUERY).matches || readMotionPreferences().reduceMotion;
}

function subscribe(onChange: () => void): () => void {
  const list = window.matchMedia(QUERY);
  list.addEventListener("change", onChange);
  const unsubscribe = subscribeMotionPreferences(onChange);
  return () => {
    list.removeEventListener("change", onChange);
    unsubscribe();
  };
}

/** The same answer as a hook, following a change of preference while the page is open. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, prefersReducedMotion, () => false);
}
