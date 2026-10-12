import type { CSSProperties } from "react";
import { PixelArt } from "../PixelArt/PixelArt";
import { PIECES } from "../PixelArt/pieces";
import { coverFor, type Cover } from "./cover";
import styles from "./GameCover.module.css";

/**
 * The 16:9 pixel cover of a game: a scanlined, glowing tile. Decorative — the title beside it names
 * the game. `tilt` opts the tile into the pointer tilt (the detail page's hero). `cover` names the
 * piece and glow outright, for art that belongs to no game (the tour); `wide` is the flatter 16:7.
 */
export function GameCover({
  gameId = "",
  cover,
  className,
  tilt = false,
  wide = false,
}: {
  gameId?: string;
  cover?: Cover;
  className?: string;
  tilt?: boolean;
  wide?: boolean;
}) {
  const { piece, tone } = cover ?? coverFor(gameId);
  return (
    <div
      className={className ? `${styles.cover} ${className}` : styles.cover}
      style={{ "--cover-glow": `var(--tb-glow-${tone})` } as CSSProperties}
      data-tilt={tilt ? "5" : undefined}
      data-wide={wide || undefined}
      aria-hidden="true"
    >
      <PixelArt grid={PIECES[piece]} className={styles.art} />
    </div>
  );
}
