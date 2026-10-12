import type { ReactNode } from "react";
import { IGlobe, ILock, IUsers } from "../../ui";
import type { RoomResource } from "./rooms-types";

type Visibility = RoomResource["visibility"];

const VISIBILITY: Record<Visibility, { label: string; icon: ReactNode }> = {
  PUBLIC: { label: "Public", icon: <IGlobe size={14} /> },
  FRIENDS_ONLY: { label: "Friends Only", icon: <IUsers size={14} /> },
  INVITE_ONLY: { label: "Invite Only", icon: <ILock size={14} /> },
};

/** Who may join, as the words and the glyph the room screen shows for it. */
export function describeVisibility(visibility: Visibility) {
  return VISIBILITY[visibility];
}
