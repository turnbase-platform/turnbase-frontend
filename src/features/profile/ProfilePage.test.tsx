import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FakeEventSource, REGISTERED, UNAUTHORIZED, installFakeApi } from "../../test/fakeApi";
import { renderAt } from "../../test/renderApp";

const session = { "GET /api/auth/session": UNAUTHORIZED };
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
      ...games,
    });
    renderAt("/users/alice");

    expect(await screen.findByRole("heading", { level: 1, name: "alice" })).toBeInTheDocument();
    expect(screen.queryByText("This profile is private.")).toBeNull();
    expect(await screen.findByRole("heading", { level: 2, name: "Friends" })).toBeInTheDocument();
    expect(await screen.findByText("bob")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Edit profile" })).toBeInTheDocument();
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
