import type { CSSProperties } from "react";
import { ART } from "../PixelArt/art";
import { PixelArt } from "../PixelArt/PixelArt";
import styles from "./Logo.module.css";

/**
 * The TurnBase mark: a player, the die whose roll is your turn, and the dev prompt. Decorative
 * beside the wordmark; give it a `title` when it stands alone.
 */
export function Logo({ size = 28, title }: { size?: number; title?: string }) {
  return (
    <span
      className={styles.logo}
      style={{ "--logo-size": `${String(size)}px` } as CSSProperties}
      aria-hidden={title ? undefined : true}
    >
      <PixelArt grid={ART.logo} title={title} />
    </span>
  );
}
