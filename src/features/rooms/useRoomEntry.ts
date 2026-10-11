import { useEffect, useState } from "react";
import { denialMessage } from "../../shared/api";
import { getRoom, joinRoom } from "./roomsApi";
import type { RoomResource } from "./rooms-types";

export type Entry =
  | { status: "resolving" }
  | { status: "prompt"; room: RoomResource; instanceHint: string | null }
  | { status: "ready"; room: RoomResource; instanceHint: string | null }
  | { status: "unavailable" };

/**
 * `/rooms/:id` entry. Opening a room never takes a seat (`IMP-GATE-95`): a caller who already
 * holds one (`viewerRole`, `room-rest-api.md` §4) re-enters it with the idempotent join — which is
 * also how a refresh or a stored link resumes (FR-REJOIN-003, 004, and a Lobby disconnect is an
 * immediate leave, FR-DC-002) — and anyone else is asked Player or Spectator (VW-JOIN-002) and is
 * enrolled by pressing one. The join's affinity header points the socket at the owning pod.
 */
export function useRoomEntry(id: string) {
  const [entry, setEntry] = useState<Entry>({ status: "resolving" });
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async (): Promise<Entry> => {
      try {
        const { room, instanceHint } = await getRoom(id);
        if (room.viewerRole !== null) {
          const joined = await joinRoom(id, room.viewerRole);
          return {
            status: "ready",
            room: joined.result.room,
            instanceHint: joined.instanceHint ?? instanceHint,
          };
        }
        if (room.canJoin || room.canSpectate) return { status: "prompt", room, instanceHint };
        return { status: "unavailable" };
      } catch {
        return { status: "unavailable" };
      }
    })().then((resolved) => {
      if (!cancelled) setEntry(resolved);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return {
    entry,
    /** Why the last enrolment was refused, shown beside the prompt. */
    failure,
    enrol: (role: "PLAYER" | "SPECTATOR") => {
      if (entry.status !== "prompt") return;
      const { instanceHint } = entry;
      setFailure(null);
      joinRoom(id, role)
        .then((joined) => {
          setEntry({
            status: "ready",
            room: joined.result.room,
            instanceHint: joined.instanceHint ?? instanceHint,
          });
        })
        .catch((error: unknown) => {
          setFailure(denialMessage(error, "Could not join the room."));
        });
    },
  };
}

export type RoomEntry = ReturnType<typeof useRoomEntry>;
