import { useState, type SyntheticEvent } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Stack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import type { RoomConnection } from "./roomSocket";
import type { ChatMessageEnvelope, RoomStateSnapshot } from "./rooms-types";

export interface ChatPanelProps {
  snapshot: RoomStateSnapshot;
  userId: string | null;
  messages: ChatMessageEnvelope["payload"][];
  connection: RoomConnection | null;
}

type Channel = "ROOM" | "TEAM";

/**
 * VW-RGAME-006…008. One chronological log for both channels (FR-MSG-004), tagged `[Room]` or
 * `[Team]` (FR-MSG-003). Players only — a spectator gets no panel (FR-CHAN-004); the server
 * refuses a spectator's send regardless (`SPECTATOR_CANNOT_CHAT`), so this is not the control.
 * The team channel is offered when the room has teams at all and the player holds one, the same
 * condition the server applies to `TEAM_CHAT_NOT_AVAILABLE` / `NO_TEAM_ASSIGNMENT`. The log is
 * the client's own (FR-CHAN-003); nothing here touches the room version (IR-08).
 */
export function ChatPanel({ snapshot, userId, messages, connection }: ChatPanelProps) {
  const me = snapshot.players.find((player) => player.playerId === userId);
  const [chosen, setChosen] = useState<Channel>("ROOM");
  const [text, setText] = useState("");
  if (!me) return null;

  const teamAvailable = snapshot.teams.length > 0 && me.teamId !== null;
  const channel: Channel = teamAvailable ? chosen : "ROOM";
  const log = [...messages].sort((a, b) => a.serverTimestamp.localeCompare(b.serverTimestamp));

  function submit(event: SyntheticEvent) {
    event.preventDefault();
    if (text.trim() === "") return;
    connection?.sendChatMessage(channel, text);
    setText("");
  }

  return (
    <Stack gap={2}>
      <Heading level={2}>Chat</Heading>
      <ul aria-label="Chat messages">
        {log.map((message) => (
          <li key={message.messageId}>
            <Text>
              [{message.channel === "TEAM" ? "Team" : "Room"}] {message.authorUsername}:{" "}
              {message.text}
            </Text>
          </li>
        ))}
      </ul>
      <form onSubmit={submit}>
        <Stack gap={2}>
          {teamAvailable && (
            <SegmentedControl
              label="Write channel"
              value={channel}
              onChange={(value) => {
                setChosen(value as Channel);
              }}
            >
              <SegmentedControlItem value="ROOM" label="Room" />
              <SegmentedControlItem value="TEAM" label="Team" />
            </SegmentedControl>
          )}
          <TextInput
            label={channel === "TEAM" ? "Message your team" : "Message the room"}
            value={text}
            onChange={setText}
            htmlName="chat"
          />
          <Button label="Send" type="submit" variant="secondary" />
        </Stack>
      </form>
    </Stack>
  );
}
