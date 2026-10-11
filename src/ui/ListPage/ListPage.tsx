import type { ReactNode } from "react";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import styles from "./ListPage.module.css";

/**
 * The frame of a list page: a one-line header, a toolbar of equal-height controls, then a body
 * that takes the rest of the screen and scrolls inside itself (`ScrollPanel`). Below 900 px the
 * page scrolls instead, because a short window cannot hold a toolbar and a list.
 */
export function ListPage({
  title,
  subtitle,
  toolbar,
  children,
}: {
  title: string;
  subtitle?: string;
  toolbar?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <Heading level={1} type="display-3">
          {title}
        </Heading>
        {subtitle && <Text color="secondary">{subtitle}</Text>}
      </header>
      <div className={styles.body}>
        {toolbar && <div className={styles.tools}>{toolbar}</div>}
        <div className={styles.main}>{children}</div>
      </div>
    </div>
  );
}
