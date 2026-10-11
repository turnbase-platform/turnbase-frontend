import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

/** True when the visitor asked the OS for less motion. Every effect in `ui/` asks this first. */
export function prefersReducedMotion(): boolean {
  return window.matchMedia(QUERY).matches;
}

function subscribe(onChange: () => void): () => void {
  const list = window.matchMedia(QUERY);
  list.addEventListener("change", onChange);
  return () => {
    list.removeEventListener("change", onChange);
  };
}

/** The same answer as a hook, following a change of preference while the page is open. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, prefersReducedMotion, () => false);
}
