import type { StreamAlert } from "./notificationStream";

/** `sse-notifications.md` § Alert types. Unknown types are dropped: an alert is never stored. */
export function alertMessage(alert: StreamAlert): string | null {
  const user = typeof alert.user === "string" ? alert.user : "Someone";
  switch (alert.type) {
    case "INVITATION_ACCEPTED":
      return `${user} accepted your invitation.`;
    case "INVITATION_DECLINED":
      return `${user} declined your invitation.`;
    case "SESSION_DISPLACED":
      return "You were signed out because your account signed in on another device.";
    default:
      return null;
  }
}

/** Terminal: the server is about to close the stream and the WebSocket (FR-SESS-010). */
export function isTerminal(alert: StreamAlert): boolean {
  return alert.type === "SESSION_DISPLACED";
}
