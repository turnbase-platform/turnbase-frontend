import { useParams } from "react-router";
import { RoomEntryView } from "./RoomEntryView";
import { RoomSessionView } from "./RoomSessionView";
import type { RoomResource } from "./rooms-types";
import { useRoomEntry } from "./useRoomEntry";
import { useRoomSession } from "./useRoomSession";

/**
 * `/rooms/:id` — one component across the room's states (`shell-architecture.md` §8). Entry
 * (`useRoomEntry`) decides whether the caller holds a seat or must pick a role; once joined, the
 * session (`useRoomSession`) owns the socket and everything the room screen shows.
 */
export function RoomPage() {
  const { id = "" } = useParams();
  // Keyed so that moving between rooms restarts entry from `resolving` with no reset effect.
  return <RoomEntry key={id} id={id} />;
}

function RoomEntry({ id }: { id: string }) {
  const entry = useRoomEntry(id);
  if (entry.entry.status !== "ready") return <RoomEntryView entry={entry} />;
  return <JoinedRoom roomId={id} room={entry.entry.room} instanceHint={entry.entry.instanceHint} />;
}

function JoinedRoom({
  roomId,
  room,
  instanceHint,
}: {
  roomId: string;
  room: RoomResource;
  instanceHint: string | null;
}) {
  const session = useRoomSession(roomId, room, instanceHint);
  return <RoomSessionView session={session} />;
}
