import { Popover } from "@astryxdesign/core/Popover";
import { IBell } from "../../ui";
import { NotificationPanel } from "./NotificationPanel";
import styles from "./NotificationBellView.module.css";
import type { NotificationBell } from "./useNotificationBell";

/**
 * VW-NAV-005: the bell, a round icon button with an amber dot while anything is unread, opening
 * the panel. The bell is an icon, never the word "Notifications": with the logo and the account
 * menu that word does not fit a phone. The dot is decoration; the count is in the accessible name.
 */
export function NotificationBellView({ bell }: { bell: NotificationBell }) {
  const { unread } = bell;
  return (
    <Popover
      label="Notifications"
      isOpen={bell.isOpen}
      onOpenChange={bell.setOpen}
      placement="below"
      alignment="end"
      width={360}
      content={
        <NotificationPanel
          reloadKey={bell.reloadKey}
          onChanged={bell.refresh}
          onClose={() => {
            bell.setOpen(false);
          }}
        />
      }
    >
      <button
        type="button"
        className={styles.bell}
        aria-label={unread > 0 ? `Notifications, ${String(unread)} unread` : "Notifications"}
      >
        <IBell size={20} />
        {unread > 0 && <span className={styles.dot} aria-hidden="true" />}
      </button>
    </Popover>
  );
}
