import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { Principal } from "../auth/auth-context";
import { authWrapper, fakeAuth } from "../../test/authWrapper";
import { GUEST, REGISTERED } from "../../test/fakeApi";
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
import { useNotificationPanel } from "./useNotificationPanel";

vi.mock("../friends/friendsApi", () => ({
  acceptFriendRequest: vi.fn(),
  deleteFriendRequest: vi.fn(),
  fetchPendingRequests: vi.fn(),
}));
vi.mock("../rooms/roomsApi", () => ({ joinRoom: vi.fn() }));
vi.mock("./notificationsApi", () => ({
  declineRoomInvitation: vi.fn(),
  deleteNotification: vi.fn(),
  fetchNotifications: vi.fn(),
  markAllRead: vi.fn(),
  markRead: vi.fn(),
}));
const navigate = vi.fn();
vi.mock("react-router", async (original) => ({
  ...(await original<typeof import("react-router")>()),
  useNavigate: () => navigate,
}));
const toast = vi.fn();
vi.mock("@astryxdesign/core/Toast", () => ({ useToast: () => toast }));

const item = (over: Partial<NotificationItem>): NotificationItem => ({
  notificationId: "n-1",
  type: "ROOM_INVITATION",
  payload: { roomId: "room 9" },
  createdAt: "2026-09-14T10:00:00Z",
  readAt: null,
  ...over,
});
const friendRequest = item({
  notificationId: "n-2",
  type: "FRIEND_REQUEST",
  payload: { username: "carol" },
});

const pageOf = (content: NotificationItem[], page = 1, totalPages = 1) => ({
  content,
  pagination: { page, size: 25, totalElements: content.length, totalPages },
});
const pending = (username: string) => ({
  content: [
    {
      requestId: "r-1",
      direction: "INCOMING" as const,
      counterpartUsername: username,
      createdAt: "",
      expiresAt: "",
    },
  ],
  pagination: { page: 1, size: 25, totalElements: 1, totalPages: 1 },
});

const onChanged = vi.fn();
const onClose = vi.fn();
function render(principal: Principal = REGISTERED) {
  return renderHook(() => useNotificationPanel({ reloadKey: 0, onChanged, onClose }), {
    wrapper: authWrapper(fakeAuth(principal)),
  });
}
async function loaded(principal: Principal = REGISTERED) {
  const hook = render(principal);
  await waitFor(() => {
    expect(hook.result.current.loaded).toBe(true);
  });
  return hook;
}

beforeEach(() => {
  vi.mocked(fetchNotifications)
    .mockReset()
    .mockResolvedValue(pageOf([item({}), friendRequest]));
  vi.mocked(fetchPendingRequests).mockReset().mockResolvedValue(pending("carol"));
  for (const fn of [
    acceptFriendRequest,
    deleteFriendRequest,
    joinRoom,
    declineRoomInvitation,
    deleteNotification,
    markAllRead,
    markRead,
  ]) {
    vi.mocked(fn as () => Promise<unknown>)
      .mockReset()
      .mockResolvedValue(undefined);
  }
  navigate.mockReset();
  toast.mockReset();
  onChanged.mockReset();
  onClose.mockReset();
});

describe("useNotificationPanel", () => {
  it("lists page 1 and marks nothing read on load (FR-NOTIF-003)", async () => {
    const { result } = await loaded();
    expect(result.current.items).toHaveLength(2);
    expect(result.current.canRespond).toBe(true);
    expect(markRead).not.toHaveBeenCalled();
    expect(markAllRead).not.toHaveBeenCalled();
  });

  it("withholds Accept / Decline from a Guest", async () => {
    const { result } = await loaded(GUEST);
    expect(result.current.canRespond).toBe(false);
  });

  it("offers Retry after a failed load, and says nothing was loaded", async () => {
    vi.mocked(fetchNotifications).mockRejectedValueOnce(new Error("down"));
    const { result } = await loaded();
    expect(result.current.failed).toBe(true);
    act(() => {
      result.current.retry();
    });
    await waitFor(() => {
      expect(result.current.failed).toBe(false);
    });
    expect(result.current.items).toHaveLength(2);
  });

  it("appends the next page on loadMore", async () => {
    vi.mocked(fetchNotifications).mockResolvedValueOnce(pageOf([item({})], 1, 2));
    const { result } = await loaded();
    expect(result.current.hasMore).toBe(true);
    vi.mocked(fetchNotifications).mockResolvedValueOnce(pageOf([friendRequest], 2, 2));
    act(() => {
      result.current.loadMore();
    });
    await waitFor(() => {
      expect(result.current.items).toHaveLength(2);
    });
    expect(fetchNotifications).toHaveBeenLastCalledWith(2);
    expect(result.current.hasMore).toBe(false);
  });

  it("joins an invitation's room, closes the panel and navigates", async () => {
    const { result } = await loaded();
    act(() => {
      result.current.accept(result.current.items[0]);
    });
    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("/rooms/room%209");
    });
    expect(joinRoom).toHaveBeenCalledWith("room 9", "PLAYER");
    expect(onClose).toHaveBeenCalled();
    await waitFor(() => {
      expect(onChanged).toHaveBeenCalled();
    });
  });

  it("declines an invitation by room", async () => {
    const { result } = await loaded();
    act(() => {
      result.current.decline(result.current.items[0]);
    });
    await waitFor(() => {
      expect(declineRoomInvitation).toHaveBeenCalledWith("room 9");
    });
  });

  it("finds the pending request by username to accept or decline a friend request", async () => {
    const { result } = await loaded();
    act(() => {
      result.current.accept(friendRequest);
    });
    await waitFor(() => {
      expect(acceptFriendRequest).toHaveBeenCalledWith("r-1");
    });
    act(() => {
      result.current.decline(friendRequest);
    });
    await waitFor(() => {
      expect(deleteFriendRequest).toHaveBeenCalledWith("r-1");
    });
  });

  it("dismisses a stale friend request that is no longer pending", async () => {
    vi.mocked(fetchPendingRequests).mockResolvedValue(pending("someone-else"));
    const { result } = await loaded();
    act(() => {
      result.current.accept(friendRequest);
    });
    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith({ body: "That friend request is no longer pending." });
    });
    expect(deleteNotification).toHaveBeenCalledWith("n-2");
    expect(acceptFriendRequest).not.toHaveBeenCalled();
  });

  it("marks one read, all read, and dismisses — reloading the list each time", async () => {
    const { result } = await loaded();
    act(() => {
      result.current.markRead(result.current.items[0]);
      result.current.markAllRead();
      result.current.dismiss(result.current.items[1]);
    });
    await waitFor(() => {
      expect(onChanged).toHaveBeenCalledTimes(3);
    });
    expect(markRead).toHaveBeenCalledWith("n-1");
    expect(markAllRead).toHaveBeenCalled();
    expect(deleteNotification).toHaveBeenCalledWith("n-2");
  });

  it("toasts the server's message, or a fallback, when an action fails", async () => {
    vi.mocked(markRead).mockRejectedValue(new ApiError(409, { status: 409, detail: "Gone." }));
    vi.mocked(deleteNotification).mockRejectedValue(new Error("down"));
    const { result } = await loaded();
    act(() => {
      result.current.markRead(result.current.items[0]);
      result.current.dismiss(result.current.items[0]);
    });
    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith({ body: "Could not dismiss." });
    });
    expect(toast).toHaveBeenCalledTimes(2);
  });
});
