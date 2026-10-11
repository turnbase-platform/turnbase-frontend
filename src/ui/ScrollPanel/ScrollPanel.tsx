import type { ReactNode } from "react";
import styles from "./ScrollPanel.module.css";

/**
 * The scrolling body of a list page: a border and nothing else, so no card hover, spotlight or
 * glow reaches the rows. The page itself does not scroll; this region does, and is focusable so
 * a keyboard can scroll it.
 */
export function ScrollPanel({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.panel}>
      <div className={styles.scroll} role="region" aria-label={label} tabIndex={0}>
        {children}
      </div>
    </div>
  );
}
