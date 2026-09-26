import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { useToast } from "@astryxdesign/core/Toast";
import { apiFetch } from "../../shared/api";
import { useAuth } from "../auth/auth-context";
import { alertMessage, isTerminal } from "./alerts";
import { openNotificationStream } from "./notificationStream";

/**
 * VW-NAV-005. Mounted only while a session exists, so the stream's lifetime is the session's
 * and there is exactly one per tab. The count is read from the API, never incremented from
 * pushes (shell-architecture.md §7): delivery is at-least-once and a local counter drifts.
 */
export function NotificationBell() {
  const { clearPrincipal } = useAuth();
  const navigate = useNavigate();
  const showToast = useToast();
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(() => {
    apiFetch<{ unreadCount: number }>("/api/notifications/unread-count")
      .then((result) => {
        setUnread(result.unreadCount);
      })
      .catch(() => undefined); // a 401 is already handled centrally; the badge just stays put
  }, []);

  useEffect(() => {
    refresh();
    return openNotificationStream({
      onNotification: refresh,
      onAlert: (alert) => {
        const message = alertMessage(alert);
        if (message) showToast({ body: message });
        if (isTerminal(alert)) {
          clearPrincipal();
          void navigate("/login");
        }
      },
    });
  }, [refresh, showToast, clearPrincipal, navigate]);

  return (
    <Button
      label="Notifications"
      variant="ghost"
      onClick={refresh}
      endContent={unread > 0 ? <Badge variant="error" label={String(unread)} /> : undefined}
    />
  );
}
