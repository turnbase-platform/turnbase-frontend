import type { CSSProperties } from "react";
import { PixelArt } from "../PixelArt/PixelArt";
import { PIECES } from "../PixelArt/pieces";
import { coverFor } from "./cover";
import styles from "./GameCover.module.css";

/**
 * The 16:9 pixel cover of a game: a scanlined, glowing tile. Decorative — the title beside it names
 * the game. `tilt` opts the tile into the pointer tilt (the detail page's hero).
 */
export function GameCover({
  gameId,
  className,
  tilt = false,
}: {
  gameId: string;
  className?: string;
  tilt?: boolean;
}) {
  const { piece, tone } = coverFor(gameId);
  return (
    <div
      className={className ? `${styles.cover} ${className}` : styles.cover}
      style={{ "--cover-glow": `var(--tb-glow-${tone})` } as CSSProperties}
      data-tilt={tilt ? "5" : undefined}
      aria-hidden="true"
    >
      <PixelArt grid={PIECES[piece]} className={styles.art} />
    </div>
  );
}
