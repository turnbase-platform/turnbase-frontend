import type { ReactNode } from "react";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { FloatingPiece } from "../FloatingPiece/FloatingPiece";
import type { PIECES } from "../PixelArt/pieces";
import styles from "./CardPage.module.css";

/**
 * The frame a single-purpose screen shares (sign-in, joining by invite): an optional piece above a
 * glass card with a title and a line.
 */
export function CardPage({
  title,
  subtitle,
  art,
  lead,
  children,
}: {
  title: string;
  subtitle?: string;
  art?: keyof typeof PIECES;
  /** What sits above the heading inside the card (an invite's code and cover). */
  lead?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={styles.page}>
      {art && (
        <div className={styles.art}>
          <FloatingPiece piece={art} depth={1} size={72} position={{ position: "static" }} />
        </div>
      )}
      <Card padding={6} elevation="med">
        <div className={styles.body}>
          {lead}
          <div>
            <Heading level={1}>{title}</Heading>
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
