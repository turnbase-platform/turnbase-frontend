import { ChatView } from "./ChatView";
import type { RoomConnection } from "./roomSocket";
import type { ChatMessageEnvelope, RoomStateSnapshot } from "./rooms-types";
import { useChat } from "./useChat";

export interface ChatPanelProps {
  snapshot: RoomStateSnapshot;
  userId: string | null;
  messages: ChatMessageEnvelope["payload"][];
  connection: RoomConnection | null;
}

/** VW-RGAME-006…008: the chat state (`useChat`) in its view. Players only (FR-CHAN-004). */
export function ChatPanel({ snapshot, userId, messages, connection }: ChatPanelProps) {
  const chat = useChat(snapshot, userId, messages, connection);
  return <ChatView chat={chat} />;
}
