import { Badge } from "@astryxdesign/core/Badge";
import { Chip, ICrown } from "../../ui";
import type { RoomPlayer } from "./rooms-types";

/** What a seat says about its player: the host's crown or their readiness, and a dropped connection. */
export function SeatBadges({
  player,
  isHost,
  showReady = true,
}: {
  player: RoomPlayer;
  isHost: boolean;
  /** Readiness means nothing once the game has started. */
  showReady?: boolean;
}) {
  return (
    <>
      {isHost ? (
        <Chip icon={<ICrown size={14} />}>Host</Chip>
      ) : (
        showReady && (
          <Badge
            label={player.ready ? "Ready" : "Not ready"}
            variant={player.ready ? "success" : "warning"}
          />
        )
      )}
      {!player.connected && <Badge label="Disconnected" variant="warning" />}
    </>
  );
}
