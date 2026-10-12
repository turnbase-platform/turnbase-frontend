import { Button } from "@astryxdesign/core/Button";
import { Text } from "@astryxdesign/core/Text";
import { LoadError } from "../../shared/LoadError";
import { notificationText } from "./notificationText";
import type { NotificationItem } from "./notificationsApi";
import type { NotificationPanelState } from "./useNotificationPanel";
import styles from "./NotificationPanelView.module.css";

function Row({ item, panel }: { item: NotificationItem; panel: NotificationPanelState }) {
  const unread = item.readAt === null;
  const respondable =
    panel.canRespond && (item.type === "ROOM_INVITATION" || item.type === "FRIEND_REQUEST");
  return (
    <li className={styles.row} data-unread={unread}>
      <Text weight={unread ? "bold" : undefined}>
        <span className={styles.text}>{notificationText(item)}</span>
      </Text>
      <div className={styles.actions}>
        {respondable && (
          <>
            <Button
              label={item.type === "ROOM_INVITATION" ? "Join" : "Accept"}
              size="sm"
              variant="primary"
              onClick={() => {
                panel.accept(item);
              }}
            />
            <Button
              label="Decline"
              size="sm"
              variant="ghost"
              onClick={() => {
                panel.decline(item);
              }}
            />
          </>
        )}
        {unread && (
          <Button
            label="Mark read"
            size="sm"
            variant="ghost"
            onClick={() => {
              panel.markRead(item);
            }}
          />
        )}
        <Button
          label="Dismiss"
          size="sm"
          variant="ghost"
          onClick={() => {
            panel.dismiss(item);
          }}
        />
      </div>
    </li>
  );
}

/** VW-NOTIF-001…004: the bell's popover content. */
export function NotificationPanelView({ panel }: { panel: NotificationPanelState }) {
  return (
    <div className={styles.panel}>
      <div className={styles.head}>
        <Text type="label">Notifications</Text>
        <Button label="Mark all read" size="sm" variant="ghost" onClick={panel.markAllRead} />
      </div>
      {panel.failed && <LoadError message="Could not load notifications." onRetry={panel.retry} />}
      {panel.loaded && !panel.failed && panel.items.length === 0 && (
        <Text color="secondary">All caught up. Nothing needs your turn.</Text>
      )}
      <ul className={styles.list} aria-label="Notifications">
        {panel.items.map((item) => (
          <Row key={item.notificationId} item={item} panel={panel} />
        ))}
      </ul>
      {panel.hasMore && <Button label="Load more" variant="secondary" onClick={panel.loadMore} />}
    </div>
  );
}
