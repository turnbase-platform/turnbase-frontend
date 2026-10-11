import { NotificationBellView } from "./NotificationBellView";
import { useNotificationBell } from "./useNotificationBell";

/** VW-NAV-005. */
export function NotificationBell() {
  return <NotificationBellView bell={useNotificationBell()} />;
}
