import { Banner } from "@astryxdesign/core/Banner";
import { Link } from "@astryxdesign/core/Link";
import { Text } from "@astryxdesign/core/Text";
import { CardPage } from "../../ui";
import { InviteCard } from "./InviteCard";
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
    return <InviteCard room={state.room} failure={failure} onEnter={enrol} />;
  }
  return null;
}
