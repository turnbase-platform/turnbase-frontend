import { useEffect, useRef } from "react";
import { Button } from "@astryxdesign/core/Button";
import { ChatMessage, ChatMessageBubble } from "@astryxdesign/core/Chat";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { TextInput } from "@astryxdesign/core/TextInput";
import { ISend } from "../../ui";
import type { Channel, Chat } from "./useChat";
import styles from "./ChatView.module.css";

/** VW-RGAME-006…008: the log, tagged `[Room]` or `[Team]` (FR-MSG-003), and the composer. */
export function ChatView({ chat, tall = false }: { chat: Chat; tall?: boolean }) {
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
    <Card padding={0} elevation="low">
      <div className={styles.chat}>
        <div className={styles.head}>
          <Heading level={2}>Room chat</Heading>
        </div>
        <div ref={log} className={styles.log} data-tall={tall || undefined}>
          {count === 0 && (
            <Text type="supporting" color="secondary">
              No messages yet.
            </Text>
          )}
          <ul aria-label="Chat messages" className={styles.list}>
            {chat.log.map((message) => (
              <li key={message.messageId}>
                <ChatMessage sender={message.mine ? "user" : "assistant"} density="compact">
                  <ChatMessageBubble
                    variant={message.mine ? undefined : "ghost"}
                    name={
                      <>
                        <span className={styles.tag} data-channel={message.channel}>
                          [{message.channel === "TEAM" ? "Team" : "Room"}]
                        </span>{" "}
                        <span className={styles.author}>{message.authorUsername}</span>
                      </>
                    }
                  >
                    {message.text}
                  </ChatMessageBubble>
                </ChatMessage>
              </li>
            ))}
          </ul>
        </div>
        <form onSubmit={chat.submit} className={styles.form}>
          {chat.teamAvailable && (
            <SegmentedControl
              label="Write channel"
              size="sm"
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
            <Button
              label="Send"
              isIconOnly
              icon={<ISend size={16} />}
              type="submit"
              variant="secondary"
            />
          </div>
        </form>
      </div>
    </Card>
  );
}
