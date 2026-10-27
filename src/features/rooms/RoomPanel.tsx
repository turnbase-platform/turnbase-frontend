import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { Banner } from "@astryxdesign/core/Banner";
import { Chip, IEye, ILogout, IPlay } from "../../ui";
import { ChatView } from "./ChatView";
import { ParticipantPanel } from "./ParticipantPanel";
import type { RoomConnection } from "./roomSocket";
import type { RoomResource, RoomStateSnapshot } from "./rooms-types";
import type { Chat } from "./useChat";
import { describeVisibility } from "./visibility";
import styles from "./RoomPanel.module.css";

export interface RoomPanelProps {
  snapshot: RoomStateSnapshot;
  userId: string | null;
  connection: RoomConnection | null;
  visibility?: RoomResource["visibility"];
  connected: boolean;
  chat: Chat;
  /** The chat is in its own window, so it is not here (VW-RGAME-016). */
  chatFloating: boolean;
  onUndockChat: () => void;
  onLeave: () => void;
  onReturnToLobby: () => void;
}

/**
 * VW-RGAME-011: what the room dock opens into — the room's name and state, who is in it (with the
 * host's transfer and kick, VW-RGAME-002, 004, 005), Return to lobby once the match is over
 * (VW-RRESULT-002), the chat (VW-RGAME-006…008, 013) and Leave room behind a confirmation
 * (VW-RGAME-012). Minimal on purpose: the game is the screen.
 */
export function RoomPanel({
  snapshot,
  userId,
  connection,
  visibility,
  connected,
  chat,
  chatFloating,
  onUndockChat,
  onLeave,
  onReturnToLobby,
}: RoomPanelProps) {
  const [confirming, setConfirming] = useState(false);
  const over = snapshot.state === "LOBBY";
  const who = visibility ? describeVisibility(visibility) : null;
  const watching = snapshot.spectators.length;

  return (
    <>
      <header className={styles.head}>
        <Heading level={2}>{snapshot.gameName}</Heading>
        <div className={styles.chips}>
          <Chip tone={over ? "neutral" : "live"}>{over ? "Match over" : "In progress"}</Chip>
          {who && <Chip icon={who.icon}>{who.label}</Chip>}
          {watching > 0 && <Chip icon={<IEye size={14} />}>{`${String(watching)} watching`}</Chip>}
        </div>
      </header>

      {!connected && <Banner status="warning" title="Connection lost — reconnecting." />}

      <ParticipantPanel snapshot={snapshot} userId={userId} connection={connection} />

      {over && (
        <Button
          label="Return to lobby"
          variant="primary"
          icon={<IPlay size={14} />}
          onClick={onReturnToLobby}
        />
      )}

      {!chatFloating && chat.available && (
        <ChatView
          chat={chat}
          chrome="bare"
          action={<Button label="Undock chat" size="sm" variant="ghost" onClick={onUndockChat} />}
        />
      )}

      <div className={styles.leave}>
        {confirming ? (
          <div role="alertdialog" aria-label="Leave the room?" className={styles.confirm}>
            <Text>Leave the room?</Text>
            <Button
              label="Stay"
              variant="secondary"
              size="sm"
              onClick={() => {
                setConfirming(false);
              }}
            />
            <Button label="Leave" variant="destructive" size="sm" onClick={onLeave} />
          </div>
        ) : (
          <Button
            label="Leave room"
            variant="secondary"
            icon={<ILogout size={14} />}
            onClick={() => {
              setConfirming(true);
            }}
          />
        )}
      </div>
    </>
  );
}
