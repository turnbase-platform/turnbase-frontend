import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
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
  | { status: "prompt"; room: RoomResource; instanceHint: string | null }
  | { status: "ready"; room: RoomResource; instanceHint: string | null }
  | { status: "unavailable" };

const CLOSED_TEXT = "This room has been closed.";

/**
 * `/rooms/:id` — one component across the room's states (`shell-architecture.md` §8). Opening it
 * never takes a seat (`IMP-GATE-95`): a caller who already holds one (`viewerRole`,
 * `room-rest-api.md` §4) re-enters it with the idempotent join — which is also how a refresh or a
 * stored link resumes (FR-REJOIN-003, 004, and a Lobby disconnect is an immediate leave,
 * FR-DC-002) — and anyone else is asked Player or Spectator (VW-JOIN-002) and is enrolled by
 * pressing one. The join's affinity header points the socket at the owning pod.
 */
export function RoomPage() {
  const { id = "" } = useParams();
  // Keyed so that moving between rooms restarts entry from `resolving` with no reset effect.
  return <RoomEntry key={id} id={id} />;
}

function RoomEntry({ id }: { id: string }) {
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

  function enrol(role: "PLAYER" | "SPECTATOR") {
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
        setFailure(error instanceof Error ? error.message : "Could not join the room.");
      });
  }

  if (entry.status === "resolving") return <Text>Entering room…</Text>;
  if (entry.status === "unavailable") {
    return (
      <Stack gap={3} padding={6}>
        <Banner
          status="error"
          title="This room is closed, or has no role available to you — it is full and cannot be spectated."
        />
        <Link href="/rooms">Browse active rooms</Link>
      </Stack>
    );
  }
  if (entry.status === "prompt") {
    return (
      <Stack gap={4} padding={6}>
        <Heading level={1}>Join a room</Heading>
        <Text>{`Join ${entry.room.gameName}, hosted by ${entry.room.hostUsername}, as:`}</Text>
        {failure && <Banner status="error" title={failure} />}
        <Stack direction="horizontal" gap={2}>
          {entry.room.canJoin && (
            <Button
              label="Join as player"
              variant="primary"
              onClick={() => {
                enrol("PLAYER");
              }}
            />
          )}
          {entry.room.canSpectate && (
            <Button
              label="Join as spectator"
              variant="secondary"
              onClick={() => {
                enrol("SPECTATOR");
              }}
            />
          )}
          <Link href="/rooms">Browse active rooms</Link>
        </Stack>
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
  const { snapshot, connected, chatMessages, lastError, ended, connection, gameStalled } =
    useRoomConnection(roomId, instanceHint);

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
          gameStalled={gameStalled}
          chatMessages={chatMessages}
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
          minPlayers={room.minPlayers}
          maxPlayers={room.maxPlayers}
          chatMessages={chatMessages}
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
