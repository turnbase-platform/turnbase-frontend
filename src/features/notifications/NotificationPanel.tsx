import { NotificationPanelView } from "./NotificationPanelView";
import { useNotificationPanel } from "./useNotificationPanel";

interface Props {
  /** Changes whenever a notification is pushed, so an open panel reloads. */
  reloadKey: number;
  /** The badge is read from the API; anything that changes it says so here. */
  onChanged: () => void;
  onClose: () => void;
}

/** VW-NOTIF-001…004. */
export function NotificationPanel(props: Props) {
  return <NotificationPanelView panel={useNotificationPanel(props)} />;
}
