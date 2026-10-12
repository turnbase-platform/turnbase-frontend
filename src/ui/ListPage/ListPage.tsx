import type { ReactNode } from "react";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import styles from "./ListPage.module.css";

/**
 * The frame of a list page: a one-line header, a toolbar of equal-height controls, then a body
 * that takes the rest of the screen and scrolls inside itself (`ScrollPanel`). Below 900 px the
 * page scrolls instead, because a short window cannot hold a toolbar and a list.
 *
 * `aside` adds a fixed-width column beside the list, and `actions` the buttons above it; they only
 * exist together, because the actions sit in the toolbar row over the aside.
 */
export function ListPage({
  title,
  subtitle,
  toolbar,
  actions,
  aside,
  children,
}: {
  title: string;
  subtitle?: string;
  toolbar?: ReactNode;
  actions?: ReactNode;
  aside?: ReactNode;
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
      <div className={styles.body} data-aside={aside ? "true" : undefined}>
        {toolbar && <div className={styles.tools}>{toolbar}</div>}
        {aside && actions && <div className={styles.actions}>{actions}</div>}
        <div className={styles.main}>{children}</div>
        {aside && <aside className={styles.aside}>{aside}</aside>}
      </div>
    </div>
  );
}
