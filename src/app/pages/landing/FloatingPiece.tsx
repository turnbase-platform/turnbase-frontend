import type { CSSProperties } from "react";
import { PIECES, PixelArt } from "../../../ui";
import styles from "./FloatingPiece.module.css";

/** A pixel piece that bobs and drifts with the cursor (strength is the theme's --tb-bg-react). */
export function FloatingPiece({
  piece,
  depth,
  size,
  delay = 0,
  position,
}: {
  piece: keyof typeof PIECES;
  depth: number;
  size: number;
  delay?: number;
  position: CSSProperties;
}) {
  return (
    <div
      className={styles.piece}
      style={
        {
          "--d": depth,
          "--s": `${String(size)}px`,
          "--delay": `${String(delay)}s`,
          ...position,
        } as CSSProperties
      }
    >
      <PixelArt grid={PIECES[piece]} />
    </div>
  );
}
