import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@astryxdesign/core/Button";
import { useToast } from "@astryxdesign/core/Toast";
import { useAuth } from "../auth/auth-context";
import { createRoom } from "../rooms/roomsApi";

/**
 * VW-CAT-003 / VW-GDET-003 / FR-CAT-008 / FR-GDET-006: removed, not disabled, for an
 * unauthenticated visitor (NFR-USAB-001).
 */
export function CreateRoomButton({ gameId }: { gameId: string }) {
  const { tier } = useAuth();
  const navigate = useNavigate();
  const showToast = useToast();
  const [isBusy, setIsBusy] = useState(false);

  if (tier === "unauth") return null;

  return (
    <Button
      label="Create room"
      variant="primary"
      isLoading={isBusy}
      onClick={() => {
        setIsBusy(true);
        createRoom({ gameId, visibility: "PUBLIC" })
          .then(({ room }) => navigate(`/rooms/${room.roomId}`))
          .catch(() => {
            showToast({ type: "error", body: "Could not create the room. Please try again." });
            setIsBusy(false);
          });
      }}
    />
  );
}
