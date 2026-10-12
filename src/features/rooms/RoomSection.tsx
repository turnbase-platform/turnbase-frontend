import type { ReactNode } from "react";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import styles from "./RoomSection.module.css";

/** One titled glass panel of the room screen (players, settings…); `aside` sits opposite the title. */
export function RoomSection({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card padding={5} elevation="low">
      <div className={styles.section}>
        <div className={styles.head}>
          <Heading level={2} type="display-3">
            {title}
          </Heading>
          {aside}
        </div>
        {children}
      </div>
    </Card>
  );
}
