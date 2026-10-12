import type { ReactNode } from "react";
import styles from "./Chip.module.css";

export type ChipTone = "neutral" | "turn" | "live";

/**
 * A small pill for a fact about the thing beside it (players, visibility, "Your turn"). `turn`
 * pulses once per two seconds unless motion is reduced; a chip is never the only carrier of a
 * state — its text says it too.
 */
export function Chip({
  tone = "neutral",
  icon,
  children,
}: {
  tone?: ChipTone;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <span className={styles.chip} data-tone={tone}>
      {icon}
      {children}
    </span>
  );
}
