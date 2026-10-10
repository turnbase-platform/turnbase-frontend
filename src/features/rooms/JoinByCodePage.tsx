import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { Link } from "@astryxdesign/core/Link";
import { Stack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { denialMessage } from "../../shared/api";
import { joinRoom, resolveInviteCode } from "./roomsApi";
import type { RoomResource } from "./rooms-types";

type JoinState =
  | { status: "resolving" }
  | { status: "choose"; room: RoomResource }
  | { status: "joining" }
  | { status: "failed"; reason: string };

const INVALID_CODE = "This invite link is not valid, has expired, or the room has closed.";
const NO_ROLE = "This room has no available role — it is full and cannot be spectated.";

/** VW-JOIN-001…003 / FR-JOIN-003…006. */
export function JoinByCodePage() {
  const { code = "" } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState<JoinState>({ status: "resolving" });

  function enter(room: RoomResource, role: "PLAYER" | "SPECTATOR") {
    setState({ status: "joining" });
    joinRoom(room.roomId, role, { inviteCode: code })
      .then(({ result }) => navigate(`/rooms/${result.room.roomId}`, { replace: true }))
      .catch((failure: unknown) => {
        setState({
          status: "failed",
          reason: denialMessage(failure, "Could not join the room."),
        });
      });
  }

  useEffect(() => {
    let cancelled = false;
    resolveInviteCode(code)
      .then((envelope) => {
        if (cancelled) return;
        // §3.1: the element is a full room resource, and an empty list is the one answer for a
        // wrong code, an expired one and a closed room.
        const room = envelope.content[0] as RoomResource | undefined;
        if (!room) {
          setState({ status: "failed", reason: INVALID_CODE });
        } else if (room.canJoin && room.canSpectate) {
          setState({ status: "choose", room });
        } else if (room.canJoin || room.canSpectate) {
          enter(room, room.canJoin ? "PLAYER" : "SPECTATOR");
        } else {
          setState({ status: "failed", reason: NO_ROLE });
        }
      })
      .catch(() => {
        if (!cancelled) setState({ status: "failed", reason: "Could not look up this invite." });
      });
    return () => {
      cancelled = true;
    };
    // `enter` only reads `code`, which is already a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  return (
    <Stack gap={4} padding={6}>
      <Heading level={1}>Join a room</Heading>
      {(state.status === "resolving" || state.status === "joining") && <Text>Joining…</Text>}
      {state.status === "choose" && (
        <Stack gap={3}>
          <Text>{`Join ${state.room.gameName}, hosted by ${state.room.hostUsername}, as:`}</Text>
          <Stack direction="horizontal" gap={2}>
            <Button
              label="Player"
              variant="primary"
              onClick={() => {
                enter(state.room, "PLAYER");
              }}
            />
            <Button
              label="Spectator"
              variant="secondary"
              onClick={() => {
                enter(state.room, "SPECTATOR");
              }}
            />
          </Stack>
        </Stack>
      )}
      {state.status === "failed" && (
        <Stack gap={3}>
          <Banner status="error" title={state.reason} />
          <Link href="/rooms">Browse active rooms</Link>
        </Stack>
      )}
    </Stack>
  );
}
