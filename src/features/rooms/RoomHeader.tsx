import { Heading } from "@astryxdesign/core/Heading";
import { Link } from "@astryxdesign/core/Link";
import { Chip, GameCover, IEye } from "../../ui";
import type { RoomResource } from "./rooms-types";
import { describeVisibility } from "./visibility";
import styles from "./RoomHeader.module.css";

/** The room screen's title block: the way back, the game's cover and name, and what to know at a glance. */
export function RoomHeader({
  gameId,
  gameName,
  visibility,
  watching,
}: {
  gameId: string;
  gameName: string;
  visibility?: RoomResource["visibility"];
  /** Spectators in the room now. */
  watching: number;
}) {
  const who = visibility ? describeVisibility(visibility) : null;
  return (
    <header className={styles.head}>
      <Link href="/rooms">← Rooms</Link>
      <div className={styles.title}>
        <GameCover gameId={gameId} className={styles.cover} />
        <div className={styles.text}>
          <Heading level={1} type="display-2">
            {gameName}
          </Heading>
          {(who !== null || watching > 0) && (
            <div className={styles.chips}>
              {who && <Chip icon={who.icon}>{who.label}</Chip>}
              {watching > 0 && (
                <Chip icon={<IEye size={14} />}>{`${String(watching)} watching`}</Chip>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
