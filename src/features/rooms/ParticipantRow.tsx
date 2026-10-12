import type { ReactNode } from "react";
import { Text } from "@astryxdesign/core/Text";
import { Person } from "../../ui";
import styles from "./ParticipantRow.module.css";

/**
 * One person in a room list, as a seat: avatar and name on the left, their badges after, and any
 * host controls on the right. No presence dot (ADR-0017 §4) — connection state is a badge.
 */
export function ParticipantRow({
  name,
  you = false,
  badges,
  actions,
}: {
  name: string;
  /** The viewer's own seat. */
  you?: boolean;
  badges?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <li className={styles.row}>
      <div className={styles.who}>
        <Person name={name} size="sm" />
        <Text weight="semibold">{name}</Text>
        {you && <Text color="secondary">(you)</Text>}
      </div>
      <div className={styles.rest}>
        {badges}
        {actions}
      </div>
    </li>
  );
}
