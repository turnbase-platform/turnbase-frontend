import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FakeEventSource, REGISTERED, GUEST, ANONYMOUS, installFakeApi } from "../../test/fakeApi";
import { renderAt } from "../../test/renderApp";

const session = { "GET /api/auth/session": ANONYMOUS };
const games = {
  "GET /api/games?owner=alice": {
    body: { content: [], pagination: { page: 1, size: 25, totalElements: 0, totalPages: 0 } },
  },
};
const friendsEnvelope = (content: unknown[] = []) => ({
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

describe("ProfilePage (VW-PROF-001…008)", () => {
  it("FR-ACCT-009: a soft-deleted account shows only the placeholder", async () => {
    installFakeApi({
      ...session,
      "GET /api/auth/providers": { body: { google: false } },
      "GET /api/users/alice": { body: { username: "alice", deleted: true } },
    });
    renderAt("/users/alice");

    expect(await screen.findByRole("heading", { level: 1, name: "alice" })).toBeInTheDocument();
    expect(await screen.findByText("This account no longer exists.")).toBeInTheDocument();
  });

  it("FR-GUEST-010: a guest profile shows only the username", async () => {
    installFakeApi({
      ...session,
      "GET /api/auth/providers": { body: { google: false } },
      "GET /api/users/guest-4f2a": { body: { username: "guest-4f2a" } },
    });
    renderAt("/users/guest-4f2a");

    expect(
      await screen.findByRole("heading", { level: 1, name: "guest-4f2a" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Friends")).toBeNull();
    expect(screen.queryByText("Uploaded games")).toBeNull();
  });

  it("FR-PROF-005: a private profile viewed by a non-owner shows only the private message", async () => {
    installFakeApi({
      ...session,
      "GET /api/auth/providers": { body: { google: false } },
      "GET /api/users/alice": {
        body: {
          username: "alice",
          userId: "u-1",
          kind: "REGISTERED",
          profilePrivate: true,
          visibleSections: [],
        },
      },
    });
    renderAt("/users/alice");

    expect(await screen.findByText("This profile is private.")).toBeInTheDocument();
  });

  it("FR-PROF-007: the owner sees a private profile in full, including a hidden friends section", async () => {
    installFakeApi({
      "GET /api/auth/session": { body: REGISTERED },
      "GET /api/notifications/unread-count": { body: { unreadCount: 0 } },
      "GET /api/users/alice": {
        body: {
          username: "alice",
          userId: "u-1",
          kind: "REGISTERED",
          profilePrivate: true,
          visibleSections: ["gameHistory", "statistics", "friends", "uploadedGames"],
        },
      },
      "GET /api/users/alice/friends": friendsEnvelope([{ userId: "u-2", username: "bob" }]),
      "GET /api/users/alice/statistics": {
        body: { totalPlayed: 17, mostPlayedGame: { gameId: "g-1", title: "Chess" } },
      },
      "GET /api/users/alice/history?page=1&size=25": friendsEnvelope(),
      ...games,
    });
    renderAt("/users/alice");

    expect(await screen.findByRole("heading", { level: 1, name: "alice" })).toBeInTheDocument();
    expect(screen.queryByText("This profile is private.")).toBeNull();
    expect(screen.getByRole("link", { name: "Edit profile" })).toBeInTheDocument();
    // VW-PROF-003: one tab per visible section, the first showing; the private flag hides none.
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      "Stats",
      "History",
      "Friends",
      "Uploaded games",
    ]);
    // FR-STATS-020…022: the totals the API returns, the most played game linked.
    expect(await screen.findByText("17")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Chess" })).toHaveAttribute("href", "/games/g-1");

    await userEvent.click(screen.getByRole("tab", { name: "Friends" }));
    expect(await screen.findByRole("link", { name: "bob" })).toHaveAttribute("href", "/users/bob");
    expect(screen.queryByText("17")).toBeNull();
  });

  it("FR-STATS-023: a user with no games shows 0 and a placeholder, no link", async () => {
    installFakeApi({
      "GET /api/auth/session": { body: REGISTERED },
      "GET /api/notifications/unread-count": { body: { unreadCount: 0 } },
      "GET /api/users/alice": {
        body: {
          username: "alice",
          userId: "u-1",
          kind: "REGISTERED",
          profilePrivate: false,
          visibleSections: ["statistics"],
        },
      },
      "GET /api/users/alice/statistics": { body: { totalPlayed: 0, mostPlayedGame: null } },
    });
    renderAt("/users/alice");

    expect(await screen.findByText("Total games played")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("an error response renders a message with a retry that reloads the profile", async () => {
    let calls = 0;
    installFakeApi({
      ...session,
      "GET /api/auth/providers": { body: { google: false } },
      "GET /api/users/guest-4f2a": () => {
        calls += 1;
        return calls === 1
          ? { status: 500, body: { type: "internal", status: 500 } }
          : { body: { username: "guest-4f2a" } };
      },
    });
    renderAt("/users/guest-4f2a");

    expect(await screen.findByText("Could not load this profile.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => {
      expect(screen.queryByText("Could not load this profile.")).toBeNull();
    });
    expect(calls).toBe(2);
  });

  it("a failing section says so and offers a retry instead of showing an empty list", async () => {
    installFakeApi({
      ...session,
      "GET /api/auth/providers": { body: { google: false } },
      "GET /api/users/alice": {
        body: {
          username: "alice",
          userId: "u-1",
          kind: "REGISTERED",
          profilePrivate: false,
          visibleSections: ["friends"],
        },
      },
      "GET /api/users/alice/friends": { status: 500, body: { type: "internal", status: 500 } },
    });
    renderAt("/users/alice");

    expect(await screen.findByText("Could not load friends.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(screen.queryByText("No friends yet")).toBeNull();
  });

  it("a public profile lets a stranger send a friend request", async () => {
    const api = installFakeApi({
      "GET /api/auth/session": { body: { ...REGISTERED, username: "carol", userId: "u-3" } },
      "GET /api/notifications/unread-count": { body: { unreadCount: 0 } },
      "GET /api/users/alice": {
        body: {
          username: "alice",
          userId: "u-1",
          kind: "REGISTERED",
          profilePrivate: false,
          visibleSections: ["uploadedGames"],
          relationshipState: "NONE",
        },
      },
      "POST /api/friend-requests": {
        status: 201,
        body: {
          outcome: "REQUEST_SENT",
          friendRequest: {
            requestId: "r-1",
            recipientUsername: "alice",
            createdAt: "now",
            expiresAt: "later",
          },
        },
      },
      ...games,
    });
    renderAt("/users/alice");

    const addButton = await screen.findByRole("button", { name: "Add friend" });
    await userEvent.click(addButton);

    expect(await screen.findByText("Friend request sent.")).toBeInTheDocument();
    expect(
      api.calls.some((call) => call.method === "POST" && call.path === "/api/friend-requests"),
    ).toBe(true);
  });

  it("FR-SOC-021: a refused send shows the refusal, not a success state or a retry prompt", async () => {
    installFakeApi({
      "GET /api/auth/session": { body: { ...REGISTERED, username: "carol", userId: "u-3" } },
      "GET /api/notifications/unread-count": { body: { unreadCount: 0 } },
      "GET /api/users/alice": {
        body: {
          username: "alice",
          userId: "u-1",
          kind: "REGISTERED",
          profilePrivate: false,
          visibleSections: ["uploadedGames"],
          relationshipState: "NONE",
        },
      },
      "POST /api/friend-requests": {
        status: 422,
        body: {
          type: "business-rule-violation",
          status: 422,
          detail: "This friend request could not be sent.",
        },
      },
      ...games,
    });
    renderAt("/users/alice");

    await userEvent.click(await screen.findByRole("button", { name: "Add friend" }));

    expect(
      (await screen.findAllByText("This friend request could not be sent.")).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText("Friend request sent.")).toBeNull();
    expect(screen.queryByText(/Please try again/)).toBeNull();
    expect(screen.getByRole("button", { name: "Add friend" })).toBeInTheDocument();
  });

  it("VW-PROF-006: a Guest viewer gets no friend action even when the server sends a state", async () => {
    installFakeApi({
      "GET /api/auth/session": { body: GUEST },
      "GET /api/notifications/unread-count": { body: { unreadCount: 0 } },
      "GET /api/users/alice": {
        body: {
          username: "alice",
          userId: "u-1",
          kind: "REGISTERED",
          profilePrivate: false,
          visibleSections: ["uploadedGames"],
          relationshipState: "NONE",
        },
      },
      ...games,
    });
    renderAt("/users/alice");

    expect(await screen.findByRole("tab", { name: "Uploaded games" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Add friend" })).toBeNull();
  });

  it("unknown username renders the not-found page", async () => {
    installFakeApi({
      ...session,
      "GET /api/auth/providers": { body: { google: false } },
      "GET /api/users/nobody": { status: 404, body: { type: "not-found", status: 404 } },
    });
    renderAt("/users/nobody");

    expect(
      await screen.findByRole("heading", { level: 1, name: "Page not found" }),
    ).toBeInTheDocument();
  });

  it("is public: an unauthenticated caller can view a public registered profile", async () => {
    installFakeApi({
      ...session,
      "GET /api/auth/providers": { body: { google: false } },
      "GET /api/users/alice": {
        body: {
          username: "alice",
          userId: "u-1",
          kind: "REGISTERED",
          profilePrivate: false,
          visibleSections: ["uploadedGames"],
        },
      },
      ...games,
    });
    renderAt("/users/alice");

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: "alice" })).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: "Add friend" })).toBeNull();
  });
});
