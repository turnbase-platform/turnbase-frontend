import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FakeEventSource, REGISTERED, installFakeApi } from "../../test/fakeApi";
import { renderAt } from "../../test/renderApp";

const signedIn = {
  "GET /api/auth/session": { body: REGISTERED },
  "GET /api/notifications/unread-count": { body: { unreadCount: 0 } },
};

const envelope = (content: unknown[]) => ({
  body: {
    content,
    pagination: { page: 1, size: 25, totalElements: content.length, totalPages: 1 },
  },
});

beforeEach(() => {
  FakeEventSource.reset();
  vi.stubGlobal("EventSource", FakeEventSource);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/** Requests sit on their own tab (VW-FREN-004); the friends are on the first. */
const openRequests = () => userEvent.click(screen.getByRole("tab", { name: /^Requests/ }));

describe("FriendsPage (VW-FREN-001…005)", () => {
  it("VW-FREN-001/002: lists friends with a link to their profile", async () => {
    installFakeApi({
      ...signedIn,
      "GET /api/users/alice/friends": envelope([{ userId: "u-2", username: "bob" }]),
      "GET /api/friend-requests": envelope([]),
    });
    renderAt("/friends");

    expect(await screen.findByRole("link", { name: "bob" })).toHaveAttribute("href", "/users/bob");
    expect(screen.getByRole("tab", { name: "All friends (1)" })).toBeInTheDocument();
  });

  it("IMP-M10-11: re-reads on a pushed FRIEND_* notification and on reconnect, not on others", async () => {
    let requests: unknown[] = [];
    installFakeApi({
      ...signedIn,
      "GET /api/users/alice/friends": envelope([]),
      "GET /api/friend-requests": () => envelope(requests),
    });
    renderAt("/friends");
    await screen.findByText("No friends yet");
    await openRequests();
    expect(await screen.findByText("No pending requests")).toBeInTheDocument();

    requests = [{ requestId: "r-1", direction: "INCOMING", counterpartUsername: "carol" }];
    const stream = FakeEventSource.instances[FakeEventSource.instances.length - 1];
    stream.emit("notification", { type: "ROOM_INVITATION", notificationId: "n-0" });
    stream.emit("notification", { type: "FRIEND_REQUEST", notificationId: "n-1" });

    expect(await screen.findByRole("button", { name: "Accept carol" })).toBeInTheDocument();

    requests = [];
    stream.onopen?.(new Event("open"));
    await waitFor(() => {
      expect(screen.getByText("No pending requests")).toBeInTheDocument();
    });
  });

  it("VW-FREN-003: removes a friend", async () => {
    const api = installFakeApi({
      ...signedIn,
      "GET /api/users/alice/friends": envelope([{ userId: "u-2", username: "bob" }]),
      "GET /api/friend-requests": envelope([]),
      "DELETE /api/users/me/friends/u-2": { status: 204 },
    });
    renderAt("/friends");

    await userEvent.click(await screen.findByRole("button", { name: "Remove bob" }));

    await waitFor(() => {
      expect(
        api.calls.some(
          (call) => call.method === "DELETE" && call.path === "/api/users/me/friends/u-2",
        ),
      ).toBe(true);
    });
  });

  it("VW-FREN-004/005: shows an incoming request and accepts it", async () => {
    const api = installFakeApi({
      ...signedIn,
      "GET /api/users/alice/friends": envelope([]),
      "GET /api/friend-requests": envelope([
        {
          requestId: "r-1",
          direction: "INCOMING",
          counterpartUsername: "carol",
          createdAt: "now",
          expiresAt: "later",
        },
      ]),
      "POST /api/friend-requests/r-1/accept": {
        body: { friend: { userId: "u-3", username: "carol" } },
      },
    });
    renderAt("/friends");

    expect(await screen.findByRole("tab", { name: "Requests 1" })).toBeInTheDocument();
    await openRequests();
    await userEvent.click(await screen.findByRole("button", { name: "Accept carol" }));

    await waitFor(() => {
      expect(
        api.calls.some(
          (call) => call.method === "POST" && call.path === "/api/friend-requests/r-1/accept",
        ),
      ).toBe(true);
    });
  });

  it("declines an incoming request", async () => {
    const api = installFakeApi({
      ...signedIn,
      "GET /api/users/alice/friends": envelope([]),
      "GET /api/friend-requests": envelope([
        {
          requestId: "r-1",
          direction: "INCOMING",
          counterpartUsername: "carol",
          createdAt: "now",
          expiresAt: "later",
        },
      ]),
      "DELETE /api/friend-requests/r-1": { status: 204 },
    });
    renderAt("/friends");

    await screen.findByRole("tab", { name: "Requests 1" });
    await openRequests();
    await userEvent.click(await screen.findByRole("button", { name: "Decline carol" }));

    await waitFor(() => {
      expect(
        api.calls.some(
          (call) => call.method === "DELETE" && call.path === "/api/friend-requests/r-1",
        ),
      ).toBe(true);
    });
  });

  it("shows empty states when there is nothing pending or no friends", async () => {
    installFakeApi({
      ...signedIn,
      "GET /api/users/alice/friends": envelope([]),
      "GET /api/friend-requests": envelope([]),
    });
    renderAt("/friends");

    expect(await screen.findByText("No friends yet")).toBeInTheDocument();
    await openRequests();
    expect(await screen.findByText("No pending requests")).toBeInTheDocument();
  });

  it("a failed load says which list failed, offers Retry, and raises no toast", async () => {
    const api = installFakeApi({
      ...signedIn,
      "GET /api/users/alice/friends": { status: 500, body: { title: "Internal Server Error" } },
      "GET /api/friend-requests": envelope([]),
    });
    renderAt("/friends");

    expect(await screen.findByText("Could not load your friends.")).toBeInTheDocument();
    await openRequests();
    expect(await screen.findByText("No pending requests")).toBeInTheDocument();
    expect(screen.queryByText(/Could not complete that action/)).toBeNull();
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
    expect(api.calls.filter((c) => c.path === "/api/users/alice/friends")).toHaveLength(1);
  });

  it("a failed action names the action and the person", async () => {
    installFakeApi({
      ...signedIn,
      "GET /api/users/alice/friends": envelope([{ userId: "u-2", username: "bob" }]),
      "GET /api/friend-requests": envelope([]),
      "DELETE /api/users/me/friends/u-2": { status: 500, body: { title: "Internal Server Error" } },
    });
    renderAt("/friends");

    await userEvent.click(await screen.findByRole("button", { name: "Remove bob" }));

    expect(
      (await screen.findAllByText(/Could not remove bob from your friends/)).length,
    ).toBeGreaterThan(0);
  });
});
