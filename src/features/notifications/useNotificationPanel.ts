import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useToast } from "@astryxdesign/core/Toast";
import { ApiError } from "../../shared/api";
import { useAuth } from "../auth/auth-context";
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

export interface NotificationPanelState {
  items: NotificationItem[];
  /** The first load has settled, either way. */
  loaded: boolean;
  failed: boolean;
  hasMore: boolean;
  /** VW-NOTIF-002/003: Accept / Decline rows are Registered-only; a Guest never sees them. */
  canRespond: boolean;
  retry: () => void;
  loadMore: () => void;
  markAllRead: () => void;
  accept: (item: NotificationItem) => void;
  decline: (item: NotificationItem) => void;
  markRead: (item: NotificationItem) => void;
  dismiss: (item: NotificationItem) => void;
}

interface Options {
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
export function useNotificationPanel({
  reloadKey,
  onChanged,
  onClose,
}: Options): NotificationPanelState {
  const navigate = useNavigate();
  const showToast = useToast();
  const { tier } = useAuth();
  const [failed, setFailed] = useState(false);
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
        setFailed(false);
        return undefined;
      });
    return collect(1, [])
      .catch(() => {
        setFailed(true); // a 401 is already handled centrally; anything else offers Retry
      })
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

  return {
    items,
    loaded,
    failed,
    hasMore: page < totalPages,
    canRespond: tier === "registered",
    retry: () => {
      void load(page);
    },
    loadMore: () => {
      void loadMore();
    },
    markAllRead: () => {
      void attempt(markAllRead, "Could not mark all read.");
    },
    accept: (item) => {
      void attempt(
        () => (item.type === "ROOM_INVITATION" ? acceptInvitation(item) : friendAction(item, true)),
        "Could not accept.",
      );
    },
    decline: (item) => {
      void attempt(
        () =>
          item.type === "ROOM_INVITATION" ? declineInvitation(item) : friendAction(item, false),
        "Could not decline.",
      );
    },
    markRead: (item) => {
      void attempt(async () => {
        await markRead(item.notificationId);
      }, "Could not mark read.");
    },
    dismiss: (item) => {
      void attempt(() => deleteNotification(item.notificationId), "Could not dismiss.");
    },
  };
}
