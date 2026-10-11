import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Popover } from "@astryxdesign/core/Popover";
import { IBell } from "../../ui";
import { NotificationPanel } from "./NotificationPanel";
import type { NotificationBell } from "./useNotificationBell";

/** VW-NAV-005: the bell with its unread count, opening the panel. */
export function NotificationBellView({ bell }: { bell: NotificationBell }) {
  const { unread } = bell;
  return (
    <Popover
      label="Notifications"
      isOpen={bell.isOpen}
      onOpenChange={bell.setOpen}
      placement="below"
      alignment="end"
      width={380}
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
      <Button
        label="Notifications"
        aria-label={unread > 0 ? `Notifications, ${String(unread)} unread` : "Notifications"}
        variant="ghost"
        icon={<IBell size={18} />}
        endContent={unread > 0 ? <Badge variant="error" label={String(unread)} /> : undefined}
      />
    </Popover>
  );
}
