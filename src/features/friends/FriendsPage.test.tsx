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

describe("FriendsPage (VW-FREN-001…005)", () => {
  it("VW-FREN-001/002: lists friends with a link to their profile", async () => {
    installFakeApi({
      ...signedIn,
      "GET /api/users/alice/friends": envelope([{ userId: "u-2", username: "bob" }]),
      "GET /api/friend-requests": envelope([]),
    });
    renderAt("/friends");

    expect(await screen.findByText("bob")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View profile" })).toHaveAttribute(
      "href",
      "/users/bob",
    );
  });

  it("VW-FREN-003: removes a friend", async () => {
    const api = installFakeApi({
      ...signedIn,
      "GET /api/users/alice/friends": envelope([{ userId: "u-2", username: "bob" }]),
      "GET /api/friend-requests": envelope([]),
      "DELETE /api/users/me/friends/u-2": { status: 204 },
    });
    renderAt("/friends");

    await userEvent.click(await screen.findByRole("button", { name: "Remove" }));

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

    expect(await screen.findByText("carol")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Accept" }));

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

    await userEvent.click(await screen.findByRole("button", { name: "Decline" }));

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

    expect(await screen.findByText("No pending requests")).toBeInTheDocument();
    expect(await screen.findByText("No friends yet")).toBeInTheDocument();
  });
});
