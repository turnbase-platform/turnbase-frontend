import type { ElementType, ReactNode } from "react";
import styles from "./Layout.module.css";

type Gap = 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10;

interface LayoutProps {
  gap?: Gap;
  as?: ElementType;
  className?: string;
  children: ReactNode;
}

function join(...names: (string | false | undefined)[]): string {
  return names.filter(Boolean).join(" ");
}

/** A vertical flow with a gap on the spacing scale. */
export function Stack({ gap = 5, as: Tag = "div", className, children }: LayoutProps) {
  return (
    <Tag className={join(styles.stack, className)} data-gap={gap}>
      {children}
    </Tag>
  );
}

/** A wrapping horizontal flow, centred on the cross axis. */
export function Row({
  gap = 3,
  as: Tag = "div",
  between = false,
  end = false,
  nowrap = false,
  className,
  children,
}: LayoutProps & { between?: boolean; end?: boolean; nowrap?: boolean }) {
  return (
    <Tag
      className={join(styles.row, className)}
      data-gap={gap}
      data-between={between || undefined}
      data-end={end || undefined}
      data-nowrap={nowrap || undefined}
    >
      {children}
    </Tag>
  );
}
