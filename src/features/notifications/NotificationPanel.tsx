import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@astryxdesign/core/Button";
import { Stack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { useToast } from "@astryxdesign/core/Toast";
import { ApiError } from "../../shared/api";
import {
  acceptFriendRequest,
  deleteFriendRequest,
  fetchPendingRequests,
} from "../friends/friendsApi";
import { joinRoom } from "../rooms/roomsApi";
import {
  declineRoomInvitation,
  deleteNotification,
  fetchNotifications,
  markAllRead,
  markRead,
  type NotificationItem,
} from "./notificationsApi";
import { notificationText } from "./notificationText";

interface Props {
  /** Changes whenever a notification is pushed, so an open panel reloads. */
  reloadKey: number;
  /** The badge is read from the API; anything that changes it says so here. */
  onChanged: () => void;
  onClose: () => void;
}

/**
 * VW-NOTIF-001…004. The list is `GET /api/notifications` only — opening it never marks
 * anything read (FR-NOTIF-003); a row is read when it is clicked, acted on or dismissed.
 */
export function NotificationPanel({ reloadKey, onChanged, onClose }: Props) {
  const navigate = useNavigate();
  const showToast = useToast();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loaded, setLoaded] = useState(false);

  /** Reloads pages 1…`upTo` so a refresh after a mutation keeps what the user already scrolled. */
  function load(upTo: number): Promise<void> {
    const collect = (next: number, soFar: NotificationItem[]): Promise<void> =>
      fetchNotifications(next).then((result) => {
        const collected = [...soFar, ...result.content];
        if (next < upTo && next < result.pagination.totalPages) return collect(next + 1, collected);
        setItems(collected);
        setTotalPages(result.pagination.totalPages);
        return undefined;
      });
    return collect(1, [])
      .catch(() => undefined) // a 401 is already handled centrally; the list stays as it was
      .then(() => {
        setLoaded(true);
      });
  }

  useEffect(() => {
    void load(page);
    // `page` is read on purpose without being a trigger: paging appends in `loadMore`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey]);

  async function refreshAfterChange() {
    onChanged();
    await load(page);
  }

  async function loadMore() {
    const next = page + 1;
    const result = await fetchNotifications(next);
    setItems((current) => [...current, ...result.content]);
    setTotalPages(result.pagination.totalPages);
    setPage(next);
  }

  /** Runs an action; a failure is a toast, and the list is reloaded either way. */
  async function attempt(action: () => Promise<void>, failure: string) {
    try {
      await action();
    } catch (error) {
      showToast({ body: error instanceof ApiError ? error.message : failure });
    }
    await refreshAfterChange();
  }

  /** `notification-rest-api.md` § Payload shapes: a friend request's id is found, not carried. */
  async function incomingRequestId(item: NotificationItem): Promise<string | null> {
    const username = item.payload.username;
    const pending = await fetchPendingRequests();
    const match = pending.content.find(
      (request) => request.direction === "INCOMING" && request.counterpartUsername === username,
    );
    return match?.requestId ?? null;
  }

  async function friendAction(item: NotificationItem, accept: boolean) {
    const requestId = await incomingRequestId(item);
    if (requestId === null) {
      // Resolved or expired elsewhere: the row is stale, not actionable.
      await deleteNotification(item.notificationId);
      showToast({ body: "That friend request is no longer pending." });
      return;
    }
    if (accept) await acceptFriendRequest(requestId);
    else await deleteFriendRequest(requestId);
  }

  async function acceptInvitation(item: NotificationItem) {
    const roomId = item.payload.roomId;
    if (typeof roomId !== "string") return;
    await joinRoom(roomId, "PLAYER");
    onClose();
    void navigate(`/rooms/${encodeURIComponent(roomId)}`);
  }

  async function declineInvitation(item: NotificationItem) {
    const roomId = item.payload.roomId;
    if (typeof roomId !== "string") return;
    await declineRoomInvitation(roomId);
  }

  function row(item: NotificationItem) {
    const unread = item.readAt === null;
    const actionable = item.type === "ROOM_INVITATION" || item.type === "FRIEND_REQUEST";
    return (
      <li key={item.notificationId} data-unread={unread}>
        <Stack gap={1}>
          <Text weight={unread ? "bold" : undefined}>{notificationText(item)}</Text>
          <Stack direction="horizontal" gap={1}>
            {actionable && (
              <>
                <Button
                  label="Accept"
                  size="sm"
                  onClick={() => {
                    void attempt(
                      () =>
                        item.type === "ROOM_INVITATION"
                          ? acceptInvitation(item)
                          : friendAction(item, true),
                      "Could not accept.",
                    );
                  }}
                />
                <Button
                  label="Decline"
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    void attempt(
                      () =>
                        item.type === "ROOM_INVITATION"
                          ? declineInvitation(item)
                          : friendAction(item, false),
                      "Could not decline.",
                    );
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
                  void attempt(async () => {
                    await markRead(item.notificationId);
                  }, "Could not mark read.");
                }}
              />
            )}
            <Button
              label="Dismiss"
              size="sm"
              variant="ghost"
              onClick={() => {
                void attempt(() => deleteNotification(item.notificationId), "Could not dismiss.");
              }}
            />
          </Stack>
        </Stack>
      </li>
    );
  }

  return (
    <Stack gap={2}>
      <Stack direction="horizontal" gap={2}>
        <Button
          label="Mark all read"
          size="sm"
          variant="secondary"
          onClick={() => {
            void attempt(markAllRead, "Could not mark all read.");
          }}
        />
      </Stack>
      {loaded && items.length === 0 && <Text>You have no notifications.</Text>}
      <ul aria-label="Notifications">{items.map(row)}</ul>
      {page < totalPages && (
        <Button
          label="Load more"
          variant="secondary"
          onClick={() => {
            void loadMore();
          }}
        />
      )}
    </Stack>
  );
}
