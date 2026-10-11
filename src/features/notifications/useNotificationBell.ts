import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useToast } from "@astryxdesign/core/Toast";
import { apiFetch } from "../../shared/api";
import { useAuth } from "../auth/auth-context";
import { alertMessage, isTerminal } from "./alerts";
import { isFriendNotification, signalFriendChange } from "./liveSignal";
import { openNotificationStream } from "./notificationStream";

export interface NotificationBell {
  unread: number;
  isOpen: boolean;
  /** Bumps on every push, so an open panel reloads. */
  reloadKey: number;
  setOpen: (open: boolean) => void;
  /** Re-reads the unread count; anything that changes it calls this. */
  refresh: () => void;
}

/**
 * VW-NAV-005. Mounted only while a session exists, so the stream's lifetime is the session's
 * and there is exactly one per tab. The count is read from the API, never incremented from
 * pushes (shell-architecture.md §7): delivery is at-least-once and a local counter drifts.
 */
export function useNotificationBell(): NotificationBell {
  const { clearPrincipal } = useAuth();
  const navigate = useNavigate();
  const showToast = useToast();
  const [unread, setUnread] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

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
      onOpen: () => {
        refresh();
        setReloadKey((key) => key + 1);
        signalFriendChange();
      },
      onNotification: (notification) => {
        refresh();
        setReloadKey((key) => key + 1);
        if (isFriendNotification(notification.type)) signalFriendChange();
      },
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

  return {
    unread,
    isOpen,
    reloadKey,
    refresh,
    setOpen: (open) => {
      setIsOpen(open);
      if (open) refresh();
    },
  };
}
