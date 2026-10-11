import type { ReactNode } from "react";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Text } from "@astryxdesign/core/Text";
import styles from "./ParticipantRow.module.css";

/**
 * One person in a room list: avatar and name on the left, their badges after, and any host
 * controls pushed to the right. No presence dot (ADR-0017 §4) — connection state is a badge.
 */
export function ParticipantRow({
  name,
  badges,
  actions,
}: {
  name: string;
  badges?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <li className={styles.row}>
      <div className={styles.who}>
        <Avatar name={name} size="sm" tooltip={false} />
        <Text>{name}</Text>
        {badges}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </li>
  );
}
