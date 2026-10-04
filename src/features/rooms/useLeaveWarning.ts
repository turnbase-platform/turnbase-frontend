import { useEffect } from "react";

/**
 * Registers a `beforeunload` handler while `active`, so a reload or tab close asks for
 * confirmation (`reconnection-flow.md` FR-DC-008: a Lobby socket loss is an immediate leave).
 */
export function useLeaveWarning(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => {
      window.removeEventListener("beforeunload", handler);
    };
  }, [active]);
}
