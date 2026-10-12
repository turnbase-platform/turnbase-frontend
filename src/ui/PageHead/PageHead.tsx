import type { ReactNode } from "react";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import styles from "./PageHead.module.css";

/** A page's title block: heading and a line under it on the left, the page's actions on the right. */
export function PageHead({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className={styles.head}>
      <div className={styles.titles}>
        <Heading level={1} type="display-2">
          {title}
        </Heading>
        {subtitle && <Text color="secondary">{subtitle}</Text>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  );
}
