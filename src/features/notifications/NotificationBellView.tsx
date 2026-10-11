import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Popover } from "@astryxdesign/core/Popover";
import { IBell } from "../../ui";
import { NotificationPanel } from "./NotificationPanel";
import type { NotificationBell } from "./useNotificationBell";

/**
 * VW-NAV-005: the bell with its unread count, opening the panel. The bell is an icon, never the
 * word "Notifications": with the logo and the account menu that word does not fit a phone's header.
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
        label={unread > 0 ? `Notifications, ${String(unread)} unread` : "Notifications"}
        variant="ghost"
        icon={<IBell size={18} />}
        isIconOnly={unread === 0}
      >
        {unread > 0 ? <Badge variant="error" label={String(unread)} /> : undefined}
      </Button>
    </Popover>
  );
}
