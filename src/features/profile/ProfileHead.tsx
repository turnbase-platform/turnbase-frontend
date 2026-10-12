import type { ReactNode } from "react";
import { Heading } from "@astryxdesign/core/Heading";
import { Chip, IUser, IUsers, Person } from "../../ui";
import type { RelationshipState } from "./profile-types";
import styles from "./ProfileHead.module.css";

/**
 * One person's glass header card: avatar, name, the facts the platform knows about them, and the
 * viewer's action on the right. The platform records no presence, join date or per-game totals for
 * a profile, so the chips say only what it does know (ADR-0017 §4, §5).
 */
export function ProfileHead({
  username,
  relationship,
  children,
}: {
  username: string;
  relationship?: RelationshipState;
  children?: ReactNode;
}) {
  return (
    <header className={`tb-glass ${styles.head}`}>
      <Person name={username} size="xl" />
      <div className={styles.name}>
        <Heading level={1} type="display-2">
          {username}
        </Heading>
        <div className={styles.chips}>
          <Chip icon={<IUser size={14} />}>{`@${username}`}</Chip>
          {relationship === "FRIENDS" && <Chip icon={<IUsers size={14} />}>Your friend</Chip>}
        </div>
      </div>
      {children && <div className={styles.actions}>{children}</div>}
    </header>
  );
}
