import type { ReactNode } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Link } from "@astryxdesign/core/Link";
import { IPlay, CardPage, GameCover } from "../../ui";
import type { RoomResource } from "./rooms-types";
import styles from "./InviteCard.module.css";

/**
 * The card a visitor sees before a seat is held: the room's game, its host and seats, and the roles
 * they may take. Shared by the invite link (`code` shown) and a room's own address.
 */
export function InviteCard({
  room,
  code,
  failure,
  onEnter,
}: {
  room: RoomResource;
  code?: string;
  failure?: ReactNode;
  onEnter: (role: "PLAYER" | "SPECTATOR") => void;
}) {
  return (
    <CardPage
      title={room.gameName}
      subtitle={`Host ${room.hostUsername} · ${String(room.playerCount)}/${String(room.playerCapacity)} players`}
      lead={
        <>
          {code && <div className={styles.code}>{code}</div>}
          <GameCover gameId={room.gameId} />
        </>
      }
    >
      {failure && <Banner status="error" title={failure} />}
      <div className={styles.actions}>
        {room.canJoin && (
          <Button
            label="Join as player"
            variant="primary"
            size="lg"
            icon={<IPlay />}
            onClick={() => {
              onEnter("PLAYER");
            }}
          />
        )}
        {room.canSpectate && (
          <Button
            label="Join as spectator"
            variant={room.canJoin ? "secondary" : "primary"}
            size="lg"
            onClick={() => {
              onEnter("SPECTATOR");
            }}
          />
        )}
      </div>
      <Link href="/rooms">Browse active rooms</Link>
    </CardPage>
  );
}
