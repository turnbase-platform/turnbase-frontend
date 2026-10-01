import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Banner } from "@astryxdesign/core/Banner";
import { Link } from "@astryxdesign/core/Link";
import { Stack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { useToast } from "@astryxdesign/core/Toast";
import { useAuth } from "../auth/auth-context";
import { RoomGame } from "./RoomGame";
import { RoomLobby } from "./RoomLobby";
import { getRoom, joinRoom, leaveRoom } from "./roomsApi";
import type { RoomResource } from "./rooms-types";
import { useRoomConnection } from "./useRoomConnection";

type Entry =
  | { status: "resolving" }
  | { status: "ready"; room: RoomResource; instanceHint: string | null }
  | { status: "unavailable" };

const CLOSED_TEXT = "This room has been closed.";

/**
 * `/rooms/:id` — one component across the room's states (`shell-architecture.md` §8). Entry
 * re-establishes membership with the idempotent join (`room-rest-api.md` §8: re-entering is
 * `POST …/participants`, a no-op for an existing participant), because a page refresh closes the
 * socket and a Lobby disconnect is an immediate leave (FR-DC-002). That is also what makes a
 * direct URL work (FR-REJOIN-003, 004). The join's affinity header points the socket at the
 * owning pod.
 */
export function RoomPage() {
  const { id = "" } = useParams();
  // Keyed so that moving between rooms restarts entry from `resolving` with no reset effect.
  return <RoomEntry key={id} id={id} />;
}

function RoomEntry({ id }: { id: string }) {
  const [entry, setEntry] = useState<Entry>({ status: "resolving" });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { room, instanceHint } = await getRoom(id);
        const role = room.canJoin ? "PLAYER" : room.canSpectate ? "SPECTATOR" : null;
        if (role === null) return { room, instanceHint };
        const joined = await joinRoom(id, role);
        return { room: joined.result.room, instanceHint: joined.instanceHint ?? instanceHint };
      } catch {
        return null;
      }
    })().then((resolved) => {
      if (cancelled) return;
      setEntry(resolved ? { status: "ready", ...resolved } : { status: "unavailable" });
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (entry.status === "resolving") return <Text>Entering room…</Text>;
  if (entry.status === "unavailable") {
    return (
      <Stack gap={3} padding={6}>
        <Banner status="error" title="This room is closed, or you cannot enter it." />
        <Link href="/rooms">Browse active rooms</Link>
      </Stack>
    );
  }
  return <RoomView roomId={id} room={entry.room} instanceHint={entry.instanceHint} />;
}

function RoomView({
  roomId,
  room,
  instanceHint,
}: {
  roomId: string;
  room: RoomResource;
  instanceHint: string | null;
}) {
  const navigate = useNavigate();
  const showToast = useToast();
  const { principal } = useAuth();
  const { snapshot, connected, lastError, ended, connection } = useRoomConnection(
    roomId,
    instanceHint,
  );

  // The session on screen. It outlives `GAME_ENDED` (the snapshot's `sessionId` is cleared then)
  // until the player dismisses the results; derived during render, not in an effect.
  const [game, setGame] = useState<{ sessionId: string; gameFrontendUrl: string } | null>(null);
  if (
    snapshot?.state === "IN_PROGRESS" &&
    snapshot.sessionId &&
    snapshot.gameFrontendUrl &&
    game?.sessionId !== snapshot.sessionId
  ) {
    setGame({ sessionId: snapshot.sessionId, gameFrontendUrl: snapshot.gameFrontendUrl });
  }

  function leave() {
    leaveRoom(roomId)
      .then(() => navigate("/rooms"))
      .catch(() => {
        showToast({ type: "error", body: "Could not leave the room." });
      });
  }

  function shareInvite() {
    if (!room.inviteCode) return;
    const link = `${window.location.origin}/rooms/join/${room.inviteCode}`;
    navigator.clipboard
      .writeText(link)
      .then(() => {
        showToast({ type: "info", body: "Invite link copied." });
      })
      .catch(() => {
        showToast({ type: "info", body: link });
      });
  }

  if (ended) {
    return (
      <Stack gap={3} padding={6}>
        <Banner
          status={ended.kind === "KICKED" ? "warning" : "info"}
          title={ended.kind === "KICKED" ? "The host removed you from this room." : CLOSED_TEXT}
        />
        <Link href="/rooms">Browse active rooms</Link>
      </Stack>
    );
  }

  return (
    <Stack gap={4} padding={6}>
      {!connected && (
        <Banner
          status="warning"
          title="Connection lost — reconnecting. The room will refresh when it is back."
        />
      )}
      {snapshot && connection && game ? (
        <RoomGame
          snapshot={snapshot}
          game={game}
          userId={principal?.userId ?? null}
          connection={connection}
          onLeave={leave}
          onReturnToLobby={() => {
            setGame(null);
          }}
        />
      ) : snapshot ? (
        <RoomLobby
          snapshot={snapshot}
          userId={principal?.userId ?? null}
          connection={connection}
          inviteCode={room.inviteCode}
          lastError={lastError}
          onLeave={leave}
          onShareInvite={shareInvite}
        />
      ) : (
        <Text>Loading room…</Text>
      )}
    </Stack>
  );
}
