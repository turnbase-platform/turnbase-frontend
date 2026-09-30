import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FakeEventSource, REGISTERED, installFakeApi } from "../../test/fakeApi";
import { renderAt } from "../../test/renderApp";

const envelope = (content: unknown[], totalPages = 1) => ({
  body: {
    content,
    pagination: { page: 1, size: 25, totalElements: content.length, totalPages },
  },
});

const invitation = {
  notificationId: "n-1",
  type: "ROOM_INVITATION",
  payload: { roomId: "room-9", hostUsername: "bob", gameName: "Chess" },
  createdAt: "2026-09-14T10:00:00Z",
  readAt: null,
};
const friendRequest = {
  notificationId: "n-2",
  type: "FRIEND_REQUEST",
  payload: { userId: "u-3", username: "carol" },
  createdAt: "2026-09-14T09:00:00Z",
  readAt: null,
};

const base = {
  "GET /api/auth/session": { body: REGISTERED },
  "GET /api/notifications/unread-count": { body: { unreadCount: 2 } },
};

async function openPanel() {
  renderAt("/games");
  await userEvent.click(await screen.findByRole("button", { name: /Notifications/ }));
}

function called(api: { calls: { method: string; path: string }[] }, method: string, path: string) {
  return api.calls.some((call) => call.method === method && call.path === path);
}

beforeEach(() => {
  FakeEventSource.reset();
  vi.stubGlobal("EventSource", FakeEventSource);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("NotificationPanel (VW-NOTIF-001…004)", () => {
  it("VW-NOTIF-001: lists notifications as text and does not mark them read on open", async () => {
    const api = installFakeApi({
      ...base,
      "GET /api/notifications?page=1&size=25": envelope([
        invitation,
        {
          ...friendRequest,
          notificationId: "n-3",
          type: "GAME_REJECTED",
          payload: { reason: "<img src=x onerror=alert(1)>" },
        },
      ]),
    });
    await openPanel();

    expect(await screen.findByText("bob invited you to play Chess.")).toBeInTheDocument();
    expect(screen.getByText("Your game was rejected: <img src=x onerror=alert(1)>")).toBeVisible();
    expect(document.querySelector("img")).toBeNull();
    expect(api.calls.some((call) => call.method === "PATCH")).toBe(false);
  });

  it("shows a placeholder for an empty list", async () => {
    installFakeApi({ ...base, "GET /api/notifications?page=1&size=25": envelope([]) });
    await openPanel();

    expect(await screen.findByText("You have no notifications.")).toBeInTheDocument();
  });

  it("VW-NOTIF-002: accepting a room invitation joins the room", async () => {
    const api = installFakeApi({
      ...base,
      "GET /api/notifications?page=1&size=25": envelope([invitation]),
      "POST /api/rooms/room-9/participants": { body: {} },
    });
    await openPanel();

    await userEvent.click(await screen.findByRole("button", { name: "Accept" }));

    await waitFor(() => {
      expect(called(api, "POST", "/api/rooms/room-9/participants")).toBe(true);
    });
  });

  it("VW-NOTIF-002: declining a room invitation deletes the caller's invitation", async () => {
    const api = installFakeApi({
      ...base,
      "GET /api/notifications?page=1&size=25": envelope([invitation]),
      "DELETE /api/rooms/room-9/invitations/me": { status: 204 },
    });
    await openPanel();

    await userEvent.click(await screen.findByRole("button", { name: "Decline" }));

    await waitFor(() => {
      expect(called(api, "DELETE", "/api/rooms/room-9/invitations/me")).toBe(true);
    });
  });

  it("VW-NOTIF-003: accepts a friend request, resolving its id from the pending list", async () => {
    const api = installFakeApi({
      ...base,
      "GET /api/notifications?page=1&size=25": envelope([friendRequest]),
      "GET /api/friend-requests": envelope([
        { requestId: "r-7", direction: "OUTGOING", counterpartUsername: "carol" },
        { requestId: "r-8", direction: "INCOMING", counterpartUsername: "carol" },
      ]),
      "POST /api/friend-requests/r-8/accept": {
        body: { friend: { userId: "u-3", username: "carol" } },
      },
    });
    await openPanel();

    await userEvent.click(await screen.findByRole("button", { name: "Accept" }));

    await waitFor(() => {
      expect(called(api, "POST", "/api/friend-requests/r-8/accept")).toBe(true);
    });
  });

  it("VW-NOTIF-003: declines a friend request", async () => {
    const api = installFakeApi({
      ...base,
      "GET /api/notifications?page=1&size=25": envelope([friendRequest]),
      "GET /api/friend-requests": envelope([
        { requestId: "r-8", direction: "INCOMING", counterpartUsername: "carol" },
      ]),
      "DELETE /api/friend-requests/r-8": { status: 204 },
    });
    await openPanel();

    await userEvent.click(await screen.findByRole("button", { name: "Decline" }));

    await waitFor(() => {
      expect(called(api, "DELETE", "/api/friend-requests/r-8")).toBe(true);
    });
  });

  it("deletes a stale friend-request row instead of acting on it", async () => {
    const api = installFakeApi({
      ...base,
      "GET /api/notifications?page=1&size=25": envelope([friendRequest]),
      "GET /api/friend-requests": envelope([]),
      "DELETE /api/notifications/n-2": { status: 204 },
    });
    await openPanel();

    await userEvent.click(await screen.findByRole("button", { name: "Accept" }));

    await waitFor(() => {
      expect(called(api, "DELETE", "/api/notifications/n-2")).toBe(true);
    });
    expect(api.calls.some((call) => call.path.endsWith("/accept"))).toBe(false);
  });

  it("VW-NOTIF-004: marks one read, marks all read and dismisses", async () => {
    const api = installFakeApi({
      ...base,
      "GET /api/notifications?page=1&size=25": envelope([
        { ...friendRequest, type: "FRIEND_ADDED" },
      ]),
      "PATCH /api/notifications/n-2": { body: { ...friendRequest, readAt: "now" } },
      "POST /api/notifications/read-all": { status: 204 },
      "DELETE /api/notifications/n-2": { status: 204 },
    });
    await openPanel();

    await userEvent.click(await screen.findByRole("button", { name: "Mark read" }));
    await waitFor(() => {
      expect(called(api, "PATCH", "/api/notifications/n-2")).toBe(true);
    });
    expect(api.calls.find((call) => call.method === "PATCH")?.body).toEqual({ read: true });

    await userEvent.click(screen.getByRole("button", { name: "Mark all read" }));
    await waitFor(() => {
      expect(called(api, "POST", "/api/notifications/read-all")).toBe(true);
    });

    await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    await waitFor(() => {
      expect(called(api, "DELETE", "/api/notifications/n-2")).toBe(true);
    });
  });

  it("pages with the shared contract", async () => {
    const api = installFakeApi({
      ...base,
      "GET /api/notifications?page=1&size=25": envelope([invitation], 2),
      "GET /api/notifications?page=2&size=25": envelope([
        { ...friendRequest, type: "FRIEND_ADDED" },
      ]),
    });
    await openPanel();

    await userEvent.click(await screen.findByRole("button", { name: "Load more" }));

    expect(await screen.findByText("You and carol are now friends.")).toBeInTheDocument();
    expect(called(api, "GET", "/api/notifications?page=2&size=25")).toBe(true);
  });
});
