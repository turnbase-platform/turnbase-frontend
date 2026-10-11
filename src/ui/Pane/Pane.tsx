import type { ReactNode } from "react";
import type { Direction } from "./direction";
import styles from "./Pane.module.css";

/**
 * Re-keys its subtree on `id`, so every change plays the entrance in `direction`. The motion
 * carries no meaning and is switched off under `prefers-reduced-motion`.
 */
export function Pane({
  id,
  direction = "up",
  className,
  children,
}: {
  id: string;
  direction?: Direction;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      key={id}
      className={className ? `${styles.pane} ${className}` : styles.pane}
      data-direction={direction}
    >
      {children}
    </div>
  );
}
