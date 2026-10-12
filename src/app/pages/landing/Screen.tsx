import type { ReactNode } from "react";
import type { ScreenId } from "./screens";
import styles from "./Screen.module.css";

/** One snap screen: `flip` puts the copy on the right on a wide window. */
export function Screen({
  id,
  flip = false,
  children,
}: {
  id: ScreenId;
  flip?: boolean;
  children: ReactNode;
}) {
  return (
    <section id={id} className={styles.screen}>
      <div className={styles.split} data-flip={flip || undefined}>
        {children}
      </div>
    </section>
  );
}

/** A screen's text column. */
export function Copy({ children }: { children: ReactNode }) {
  return <div className={styles.copy}>{children}</div>;
}

/** A row of calls to action. */
export function Actions({ children, centre = false }: { children: ReactNode; centre?: boolean }) {
  return (
    <div className={styles.actions} data-centre={centre || undefined}>
      {children}
    </div>
  );
}
