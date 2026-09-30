import { apiFetch } from "../../shared/api";
import type { ListEnvelope } from "../../shared/pagination";

/** `notification-rest-api.md` §2 — `payload` is typed by `type`, rendered as text only. */
export interface NotificationItem {
  notificationId: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: string;
  readAt: string | null;
}

export const PAGE_SIZE = 25;

/** §2 — always newest first; `page` is 1-based. */
export function fetchNotifications(page: number): Promise<ListEnvelope<NotificationItem>> {
  return apiFetch<ListEnvelope<NotificationItem>>(
    `/api/notifications?page=${String(page)}&size=${String(PAGE_SIZE)}`,
  );
}

/** §4 — one-way: there is no un-read. */
export function markRead(notificationId: string): Promise<NotificationItem> {
  return apiFetch<NotificationItem>(`/api/notifications/${notificationId}`, {
    method: "PATCH",
    body: { read: true },
  });
}

/** §5. */
export function markAllRead(): Promise<undefined> {
  return apiFetch<undefined>("/api/notifications/read-all", { method: "POST" });
}

/** §6 — `204` whether or not the row still exists. */
export function deleteNotification(notificationId: string): Promise<undefined> {
  return apiFetch<undefined>(`/api/notifications/${notificationId}`, { method: "DELETE" });
}

/** `room-invitation-rest-api.md` §3 — the invitee's own pending invitation; `204` either way. */
export function declineRoomInvitation(roomId: string): Promise<undefined> {
  return apiFetch<undefined>(`/api/rooms/${encodeURIComponent(roomId)}/invitations/me`, {
    method: "DELETE",
  });
}
