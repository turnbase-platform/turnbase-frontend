import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { RadioList, RadioListItem } from "@astryxdesign/core/RadioList";
import { Stack } from "@astryxdesign/core/Stack";
import { Switch } from "@astryxdesign/core/Switch";
import { useToast } from "@astryxdesign/core/Toast";
import { IPlus } from "../../ui";
import { useAuth } from "../auth/auth-context";
import { createRoom } from "../rooms/roomsApi";

type Visibility = "PUBLIC" | "FRIENDS_ONLY" | "INVITE_ONLY";

/**
 * VW-CAT-003 / VW-GDET-003 / FR-CAT-008 / FR-GDET-006: removed, not disabled, for an
 * unauthenticated visitor (NFR-USAB-001). FR-CREATE-001/002: the button opens the choice of
 * visibility and — only for a game that supports spectators — whether spectating is allowed.
 * FR-LIST-006 / FR-GUEST-007: a Guest has no friends, so Friends Only is not offered.
 */
export function CreateRoomButton({
  gameId,
  supportsSpectators,
  variant = "primary",
  size,
}: {
  gameId: string;
  supportsSpectators: boolean;
  variant?: "primary" | "secondary";
  size?: "lg";
}) {
  const { tier } = useAuth();
  const navigate = useNavigate();
  const showToast = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [visibility, setVisibility] = useState<Visibility>("PUBLIC");
  const [spectatingEnabled, setSpectatingEnabled] = useState(false);

  if (tier === "unauth") return null;

  function submit() {
    setIsBusy(true);
    createRoom({ gameId, visibility, ...(supportsSpectators ? { spectatingEnabled } : {}) })
      .then(({ room }) => navigate(`/rooms/${room.roomId}`))
      .catch(() => {
        showToast({ type: "error", body: "Could not create the room. Please try again." });
        setIsBusy(false);
      });
  }

  return (
    <>
      <Button
        label="Create room"
        variant={variant}
        icon={<IPlus />}
        {...(size ? { size } : {})}
        onClick={() => {
          setIsOpen(true);
        }}
      />
      <Dialog isOpen={isOpen} onOpenChange={setIsOpen} purpose="form">
        <DialogHeader title="Create room" onOpenChange={setIsOpen} />
        <Stack gap={4} padding={4}>
          <RadioList
            label="Visibility"
            value={visibility}
            onChange={(value) => {
              setVisibility(value as Visibility);
            }}
          >
            <RadioListItem label="Public" value="PUBLIC" />
            {tier !== "guest" && <RadioListItem label="Friends Only" value="FRIENDS_ONLY" />}
            <RadioListItem label="Invite Only" value="INVITE_ONLY" />
          </RadioList>
          {supportsSpectators && (
            <Switch
              label="Allow spectators"
              value={spectatingEnabled}
              onChange={setSpectatingEnabled}
            />
          )}
          <Stack direction="horizontal" gap={2}>
            <Button
              label="Cancel"
              variant="ghost"
              onClick={() => {
                setIsOpen(false);
              }}
            />
            <Button label="Create" variant="primary" isLoading={isBusy} onClick={submit} />
          </Stack>
        </Stack>
      </Dialog>
    </>
  );
}
