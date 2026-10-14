import type { HTMLAttributes, ReactNode } from "react";

/**
 * The glass surface (theme/surfaces.css): a tint, a sheen, the cursor spotlight and a lit edge.
 * `tilt` opts it into the pointer tilt, in degrees at the edge — leave it out for a surface that
 * should stay put; only a hero object earns it.
 */
export function Glass({
  tilt,
  className,
  children,
  ...rest
}: { tilt?: number; children: ReactNode } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      className={className ? `tb-glass ${className}` : "tb-glass"}
      data-tilt={tilt === undefined ? undefined : String(tilt)}
    >
      {children}
    </div>
  );
}
