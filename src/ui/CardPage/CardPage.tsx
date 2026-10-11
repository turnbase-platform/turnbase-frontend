import type { ReactNode } from "react";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { Logo } from "../Logo/Logo";
import styles from "./CardPage.module.css";

/** The frame a single-purpose screen shares (sign-in, joining by invite): the mark above a glass card with a title and a line. */
export function CardPage({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.page}>
      <Logo size={56} />
      <Card padding={6} elevation="med">
        <div className={styles.body}>
          <div>
            <Heading level={1} type="display-3">
              {title}
            </Heading>
            {subtitle && <Text color="secondary">{subtitle}</Text>}
          </div>
          {children}
        </div>
      </Card>
    </div>
  );
}

/** The fields of one form, stacked. */
export function FormFields({ children }: { children: ReactNode }) {
  return <div className={styles.fields}>{children}</div>;
}
