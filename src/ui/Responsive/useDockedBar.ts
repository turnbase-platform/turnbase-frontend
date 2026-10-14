import { useSyncExternalStore } from "react";

/** The width at which the nav bar leaves the top of the screen for the bottom (NavBar.module.css). */
const DOCKED_BAR = "(max-width: 760px)";

function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia(DOCKED_BAR);
  query.addEventListener("change", onChange);
  return () => {
    query.removeEventListener("change", onChange);
  };
}

/**
 * Whether the nav bar sits at the foot of the screen. A menu or popover opened from it has to open
 * *above* it: Astryx flips by the room left in the document, not the viewport, so a tall page lets
 * a "below" panel open under the fold where nothing can scroll it into reach.
 */
export function useDockedBar(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(DOCKED_BAR).matches,
    () => false,
  );
}
