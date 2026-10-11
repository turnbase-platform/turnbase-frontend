import type { ReactNode } from "react";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import styles from "./RoomSection.module.css";

/** One titled glass panel of the room screen (players, chat, parameters…). */
export function RoomSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card padding={4} elevation="low">
      <div className={styles.section}>
        <Heading level={2} type="display-3">
          {title}
        </Heading>
        {children}
      </div>
    </Card>
  );
}
