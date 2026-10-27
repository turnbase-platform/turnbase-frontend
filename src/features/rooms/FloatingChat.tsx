import { useRef } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Text } from "@astryxdesign/core/Text";
import { IChat, IX } from "../../ui";
import { ChatView } from "./ChatView";
import type { Chat } from "./useChat";
import { useDraggable } from "./useDraggable";
import styles from "./FloatingChat.module.css";

/**
 * VW-RGAME-014, 015: the chat as a semitransparent window over the game. The title bar is the drag
 * handle (and takes the arrow keys while focused); closing it docks the chat back into the room
 * panel. Players only — the room offers it only to a seat that has a chat.
 */
export function FloatingChat({ chat, onDock }: { chat: Chat; onDock: () => void }) {
  const box = useRef<HTMLElement>(null);
  const { position, dragging, handle } = useDraggable(box);

  return (
    <section
      ref={box}
      aria-label="Room chat"
      className={styles.window}
      data-dragging={dragging || undefined}
      style={position ? { left: position.x, top: position.y, right: "auto", bottom: "auto" } : {}}
    >
      <div
        className={styles.bar}
        {...handle}
        tabIndex={0}
        role="group"
        aria-label="Chat window — drag to move, or use the arrow keys"
      >
        <IChat size={16} />
        <Text type="supporting" color="secondary">
          Room chat
        </Text>
        <Button
          label="Dock chat"
          isIconOnly
          size="sm"
          variant="ghost"
          icon={<IX size={14} />}
          onClick={onDock}
        />
      </div>
      <ChatView chat={chat} chrome="floating" />
    </section>
  );
}
