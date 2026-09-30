import type { NotificationItem } from "./notificationsApi";

function text(payload: Record<string, unknown>, key: string, fallback: string): string {
  const value = payload[key];
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

/** `notification-rest-api.md` § Payload shapes; an unknown `type` still gets a neutral line. */
export function notificationText(item: NotificationItem): string {
  const { type, payload } = item;
  const user = text(payload, "username", "Someone");
  switch (type) {
    case "ROOM_INVITATION":
      return `${text(payload, "hostUsername", "Someone")} invited you to play ${text(payload, "gameName", "a game")}.`;
    case "FRIEND_REQUEST":
      return `${user} sent you a friend request.`;
    case "FRIEND_REQUEST_ACCEPTED":
      return `${user} accepted your friend request.`;
    case "FRIEND_REQUEST_DECLINED":
      return `${user} declined your friend request.`;
    case "FRIEND_ADDED":
      return `You and ${user} are now friends.`;
    case "GAME_APPROVED":
      return "Your game was approved.";
    case "GAME_REJECTED":
      return `Your game was rejected: ${text(payload, "reason", "no reason given")}`;
    case "BUNDLE_VALIDATION_COMPLETE":
      return "Your game bundle finished validating.";
    default:
      return "You have a new notification.";
  }
}
