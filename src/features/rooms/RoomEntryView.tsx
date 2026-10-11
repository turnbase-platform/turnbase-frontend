import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Link } from "@astryxdesign/core/Link";
import { Text } from "@astryxdesign/core/Text";
import { CardPage } from "../../ui";
import type { RoomEntry } from "./useRoomEntry";
import styles from "./RoomEntryView.module.css";

const UNAVAILABLE =
  "This room is closed, or has no role available to you — it is full and cannot be spectated.";

/** The `/rooms/:id` screens before a seat is held: resolving, unavailable, and the role prompt. */
export function RoomEntryView({ entry }: { entry: RoomEntry }) {
  const { entry: state, failure, enrol } = entry;

  if (state.status === "resolving") {
    return (
      <div className={styles.status}>
        <Text>Entering room…</Text>
      </div>
    );
  }
  if (state.status === "unavailable") {
    return (
      <CardPage title="Room unavailable">
        <Banner status="error" title={UNAVAILABLE} />
        <Link href="/rooms">Browse active rooms</Link>
      </CardPage>
    );
  }
  if (state.status === "prompt") {
    return (
      <CardPage
        title="Join a room"
        subtitle={`Join ${state.room.gameName}, hosted by ${state.room.hostUsername}, as:`}
      >
        {failure && <Banner status="error" title={failure} />}
        <div className={styles.actions}>
          {state.room.canJoin && (
            <Button
              label="Join as player"
              variant="primary"
              onClick={() => {
                enrol("PLAYER");
              }}
            />
          )}
          {state.room.canSpectate && (
            <Button
              label="Join as spectator"
              variant="secondary"
              onClick={() => {
                enrol("SPECTATOR");
              }}
            />
          )}
        </div>
        <Link href="/rooms">Browse active rooms</Link>
      </CardPage>
    );
  }
  return null;
}
