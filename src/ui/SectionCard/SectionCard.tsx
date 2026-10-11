import type { ReactNode } from "react";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import styles from "./SectionCard.module.css";

/** One titled glass panel of a screen made of several (a profile's statistics, a room's players). */
export function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card padding={4} elevation="low">
      <section className={styles.section}>
        <Heading level={2} type="display-3">
          {title}
        </Heading>
        {children}
      </section>
    </Card>
  );
}
