import { useEffect, useRef } from "react";
import { Button } from "@astryxdesign/core/Button";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { TextInput } from "@astryxdesign/core/TextInput";
import { RoomSection } from "./RoomSection";
import type { Channel, Chat } from "./useChat";
import styles from "./ChatView.module.css";

/** VW-RGAME-006…008: the log, tagged `[Room]` or `[Team]` (FR-MSG-003), and the composer. */
export function ChatView({ chat }: { chat: Chat }) {
  const log = useRef<HTMLDivElement>(null);
  const count = chat.log.length;
  // A new message scrolls the log, not the page.
  useEffect(() => {
    const element = log.current;
    if (element && count > 0) element.scrollTop = element.scrollHeight;
  }, [count]);

  if (!chat.available) return null;
  const label = chat.channel === "TEAM" ? "Message your team" : "Message the room";

  return (
    <RoomSection title="Chat">
      <div ref={log} className={styles.log}>
        <ul aria-label="Chat messages" className={styles.list}>
          {chat.log.map((message) => (
            <li key={message.messageId} className={styles.message}>
              <span className={styles.tag} data-channel={message.channel}>
                [{message.channel === "TEAM" ? "Team" : "Room"}]
              </span>{" "}
              <span className={styles.author}>{message.authorUsername}:</span> {message.text}
            </li>
          ))}
        </ul>
      </div>
      <form onSubmit={chat.submit} className={styles.form}>
        {chat.teamAvailable && (
          <SegmentedControl
            label="Write channel"
            value={chat.channel}
            onChange={(value) => {
              chat.setChannel(value as Channel);
            }}
          >
            <SegmentedControlItem value="ROOM" label="Room" />
            <SegmentedControlItem value="TEAM" label="Team" />
          </SegmentedControl>
        )}
        <div className={styles.compose}>
          <div className={styles.input}>
            <TextInput
              label={label}
              isLabelHidden
              placeholder={label}
              value={chat.text}
              onChange={chat.setText}
              htmlName="chat"
            />
          </div>
          <Button label="Send" type="submit" variant="secondary" />
        </div>
      </form>
    </RoomSection>
  );
}
