import { useEffect, useId, useState, type ReactNode } from "react";
import { Logo } from "../../ui";
import styles from "./RoomDock.module.css";

/**
 * VW-RGAME-010, 011: the one platform control over a game. A round, semitransparent button that
 * grows into the room panel it holds (`immersive-room.md` §2.2, 2.3). The panel's content is
 * mounted only while it is open, so a closed dock puts a single control in the tab order. It does
 * not close on a click in the game: the game stays playable with the panel open.
 */
export function RoomDock({
  warning = false,
  children,
}: {
  /** The connection is lost: a dot on the button, so the state shows with the panel shut. */
  warning?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={styles.dock} data-open={open || undefined}>
      {open && (
        <div id={panelId} role="region" aria-label="Room" className={styles.panel}>
          {children}
        </div>
      )}
      <button
        type="button"
        className={styles.mark}
        aria-label="Room menu"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => {
          setOpen((was) => !was);
        }}
      >
        <Logo size={26} />
        {warning && <span className={styles.warning} role="img" aria-label="Connection lost" />}
      </button>
    </div>
  );
}
