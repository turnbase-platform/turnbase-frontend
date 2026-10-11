import type { ReactNode } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { ART, IGames, IRooms, IUsers, PixelArt } from "../../ui";
import styles from "./LandingView.module.css";

const FEATURES = [
  {
    icon: <IGames size={24} />,
    title: "Games",
    text: "A catalog of official games, plus games uploaded by the community",
  },
  {
    icon: <IRooms size={24} />,
    title: "Rooms",
    text: "Rooms with invite links and friend invitations",
  },
  {
    icon: <IUsers size={24} />,
    title: "Friends",
    text: "Friends, profiles and game history",
  },
];

/**
 * VW-LAND-001…004. `guest` is the Guest button — it owns a session request, so the page composes
 * it in rather than the view importing it.
 */
export function LandingView({ showActions, guest }: { showActions: boolean; guest: ReactNode }) {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.copy}>
          <Heading level={1} type="display-1">
            Turn-based games, together
          </Heading>
          <Text type="large" color="secondary">
            TurnBase hosts multiplayer turn-based games in your browser. Browse the catalog, open a
            room, invite your friends and play — with in-room chat and a history of every game.
          </Text>
          {showActions && (
            <div className={styles.actions}>
              <Button label="Log in" variant="primary" size="lg" href="/login" />
              <Button label="Register" variant="secondary" size="lg" href="/register" />
              {guest}
            </div>
          )}
        </div>
        <div className={styles.stage} aria-hidden="true">
          <div className={`tb-glass ${styles.table}`} data-tilt="7">
            <PixelArt grid={ART.logo} className={styles.mark} />
          </div>
          <PixelArt grid={ART.heart} className={`${styles.piece} ${styles.heart}`} />
          <PixelArt grid={ART.bolt} className={`${styles.piece} ${styles.bolt}`} />
          <PixelArt grid={ART.hourglass} className={`${styles.piece} ${styles.hourglass}`} />
        </div>
      </section>
      <ul className={styles.features}>
        {FEATURES.map(({ icon, title, text }) => (
          <li key={title}>
            <Card padding={5}>
              <div className={styles.feature}>
                <span className={styles.icon}>{icon}</span>
                <Heading level={2}>{title}</Heading>
                <Text color="secondary">{text}</Text>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
