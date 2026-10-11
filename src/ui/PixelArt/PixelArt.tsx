import styles from "./PixelArt.module.css";
import { runs } from "./runs";

/** A pixel-art grid as crisp SVG. Decorative unless given a `title`. */
export function PixelArt({
  grid,
  className,
  title,
}: {
  grid: readonly string[];
  className?: string;
  title?: string;
}) {
  const width = Math.max(0, ...grid.map((row) => row.length));
  return (
    <svg
      className={className ? `${styles.art} ${className}` : styles.art}
      viewBox={`0 0 ${String(width)} ${String(grid.length)}`}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {runs(grid).map((r) => (
        <rect
          key={`${String(r.x)}-${String(r.y)}`}
          x={r.x}
          y={r.y}
          width={r.width}
          height={1}
          fill={`var(--px-${r.colour})`}
        />
      ))}
    </svg>
  );
}
