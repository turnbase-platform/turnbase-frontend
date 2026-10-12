import { useState, type SyntheticEvent } from "react";
import { hasTeamChannel } from "./roomRules";
import type { RoomConnection } from "./roomSocket";
import type { ChatMessageEnvelope, RoomStateSnapshot } from "./rooms-types";

export type Channel = "ROOM" | "TEAM";

/**
 * VW-RGAME-006…008. One chronological log for both channels (FR-MSG-004). Players only — a
 * spectator gets no chat (FR-CHAN-004); the server refuses a spectator's send regardless
 * (`SPECTATOR_CANNOT_CHAT`), so this is not the control. The team channel is offered when the game
 * has team support and the player holds a team, the same condition the server applies to
 * `TEAM_CHAT_NOT_AVAILABLE` / `NO_TEAM_ASSIGNMENT`. The log is the client's own (FR-CHAN-003);
 * nothing here touches the room version (IR-08).
 */
export function useChat(
  snapshot: RoomStateSnapshot,
  userId: string | null,
  messages: ChatMessageEnvelope["payload"][],
  connection: RoomConnection | null,
) {
  const me = snapshot.players.find((player) => player.playerId === userId);
  const [chosen, setChosen] = useState<Channel>("ROOM");
  const [text, setText] = useState("");

  const teamAvailable = hasTeamChannel(snapshot) && me !== undefined && me.teamId !== null;
  const channel: Channel = teamAvailable ? chosen : "ROOM";

  return {
    /** A spectator has no chat. */
    available: me !== undefined,
    teamAvailable,
    channel,
    text,
    log: [...messages]
      .sort((a, b) => a.serverTimestamp.localeCompare(b.serverTimestamp))
      .map((message) => ({ ...message, mine: message.authorId === userId })),
    setChannel: setChosen,
    setText,
    submit: (event: SyntheticEvent) => {
      event.preventDefault();
      if (text.trim() === "") return;
      connection?.sendChatMessage(channel, text);
      setText("");
    },
  };
}

export type Chat = ReturnType<typeof useChat>;
