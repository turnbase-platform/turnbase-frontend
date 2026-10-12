import type { ReactNode } from "react";
import styles from "./RoomLayout.module.css";

/** The room screen's page: a main column and the chat beside it, stacked on a narrow screen. */
export function RoomLayout({ main, aside }: { main: ReactNode; aside?: ReactNode }) {
  return (
    <div className={styles.layout} data-aside={aside ? "true" : undefined}>
      <div className={styles.main}>{main}</div>
      {aside && <div className={styles.aside}>{aside}</div>}
    </div>
  );
}
