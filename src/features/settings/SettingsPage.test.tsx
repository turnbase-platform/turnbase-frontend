import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FakeEventSource, REGISTERED, installFakeApi } from "../../test/fakeApi";
import { renderAt, where } from "../../test/renderApp";

const signedIn = {
  "GET /api/auth/session": { body: REGISTERED },
  "GET /api/notifications/unread-count": { body: { unreadCount: 0 } },
};

const account = {
  userId: "u-1",
  username: "alice",
  email: "alice@example.com",
  emailSource: "SELF",
  usernameChangeableAt: null,
  emailChangeableAt: null,
  authMethods: ["PASSWORD"],
  privacy: {
    profilePrivate: false,
    historyVisibility: "PUBLIC",
    statsVisibility: "PUBLIC",
    gamesVisibility: "PUBLIC",
    friendsVisibility: "PUBLIC",
    blockFriendRequests: false,
  },
};

beforeEach(() => {
  FakeEventSource.reset();
  vi.stubGlobal("EventSource", FakeEventSource);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("SettingsPage (VW-SET-001…007)", () => {
  it("VW-SET-003: changes the password", async () => {
    const api = installFakeApi({
      ...signedIn,
      "GET /api/users/me": { body: account },
      "POST /api/users/me/password": { status: 204 },
    });
    renderAt("/settings");

    await userEvent.type(
      await screen.findByLabelText("Current password", { exact: false }),
      "old-pass",
    );
    await userEvent.type(screen.getByLabelText(/^New password/), "new-pass-123");
    await userEvent.type(
      screen.getByLabelText("Confirm new password", { exact: false }),
      "new-pass-123",
    );
    await userEvent.click(screen.getByRole("button", { name: "Change password" }));

    await waitFor(() => {
      const call = api.calls.find(
        (entry) => entry.method === "POST" && entry.path === "/api/users/me/password",
      );
      expect(call?.body).toEqual({
        currentPassword: "old-pass",
        newPassword: "new-pass-123",
        confirmNewPassword: "new-pass-123",
      });
    });
  });

  it("VW-SET-004: an OAuth-only account gets an Add password form instead", async () => {
    installFakeApi({
      ...signedIn,
      "GET /api/users/me": { body: { ...account, authMethods: ["GOOGLE"] } },
    });
    renderAt("/settings");

    expect(
      await screen.findByRole("heading", { level: 3, name: "Add a password" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 3, name: "Change password" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Link Google account" })).toBeNull();
  });

  it("VW-SET-005: Remove is hidden with only one sign-in method linked", async () => {
    installFakeApi({
      ...signedIn,
      "GET /api/users/me": { body: account },
    });
    renderAt("/settings");

    await screen.findByText("Password");
    expect(screen.queryByRole("button", { name: /^Remove/ })).toBeNull();
  });

  it("VW-SET-005: Remove is enabled with two sign-in methods linked", async () => {
    const api = installFakeApi({
      ...signedIn,
      "GET /api/users/me": { body: { ...account, authMethods: ["PASSWORD", "GOOGLE"] } },
      "DELETE /api/users/me/auth-methods/GOOGLE": { status: 204 },
    });
    renderAt("/settings");

    expect(await screen.findAllByRole("button", { name: /^Remove/ })).toHaveLength(2);
    await userEvent.click(screen.getByRole("button", { name: "Remove Google" }));

    await waitFor(() => {
      expect(
        api.calls.some(
          (call) => call.method === "DELETE" && call.path === "/api/users/me/auth-methods/GOOGLE",
        ),
      ).toBe(true);
    });
  });

  it("VW-SET-006/006a: privacy toggle hides the per-section controls when private", async () => {
    const api = installFakeApi({
      ...signedIn,
      "GET /api/users/me": { body: account },
      "PATCH /api/users/me/privacy": {
        body: { ...account.privacy, profilePrivate: true },
      },
    });
    renderAt("/settings");

    expect(await screen.findAllByRole("radio", { name: "Public" })).toHaveLength(4);
    await userEvent.click(screen.getByRole("switch", { name: "Make my profile private" }));

    await waitFor(() => {
      expect(screen.queryAllByRole("radio", { name: "Public" })).toHaveLength(0);
    });
    expect(
      api.calls.some(
        (call) =>
          call.method === "PATCH" &&
          call.path === "/api/users/me/privacy" &&
          (call.body as Record<string, unknown>).profilePrivate === true,
      ),
    ).toBe(true);
  });

  it("VW-SET-007 / FR-ACCT-004: deleting the account is a confirmed, explicit action", async () => {
    const api = installFakeApi({
      ...signedIn,
      "GET /api/users/me": { body: account },
      "DELETE /api/users/me": { status: 204 },
      "POST /api/auth/logout": { status: 204 },
    });
    renderAt("/settings");

    await userEvent.click(await screen.findByRole("button", { name: "Delete my account" }));
    // The action is gated behind an AlertDialog — clicking the opener alone must not call the API.
    expect(
      api.calls.some((call) => call.method === "DELETE" && call.path === "/api/users/me"),
    ).toBe(false);

    const dialog = await screen.findByRole("alertdialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete account" }));

    await waitFor(() => {
      expect(where()).toBe("/");
    });
    expect(
      api.calls.some((call) => call.method === "DELETE" && call.path === "/api/users/me"),
    ).toBe(true);
  });

  it("a failed load shows an error with Retry, not a permanent Loading…", async () => {
    let calls = 0;
    installFakeApi({
      ...signedIn,
      "GET /api/users/me": () => (++calls === 1 ? { status: 500 } : { body: account }),
    });
    renderAt("/settings");

    expect(await screen.findByText("Could not load your account settings.")).toBeInTheDocument();
    expect(screen.queryByText("Loading…")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("button", { name: "Save username" })).toBeInTheDocument();
  });

  it("VW-SET-002: the email form is absent for an address bound to Google", async () => {
    installFakeApi({
      ...signedIn,
      "GET /api/users/me": {
        body: { ...account, authMethods: ["GOOGLE"], emailSource: "OAUTH" },
      },
    });
    renderAt("/settings");

    expect(await screen.findByRole("button", { name: "Save username" })).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Email/)).toBeNull();
    expect(screen.queryByRole("button", { name: "Save email" })).toBeNull();
  });

  it("VW-SET-001: saves a new username, confirms it, and shows a field error from the server", async () => {
    const api = installFakeApi({
      ...signedIn,
      "GET /api/users/me": { body: account },
      "PATCH /api/users/me": (call) =>
        (call.body as { username: string }).username === "taken"
          ? {
              status: 400,
              body: {
                type: "about:blank",
                title: "Bad Request",
                status: 400,
                errors: [{ field: "username", message: "That username is not allowed." }],
              },
            }
          : { body: { ...account, username: "alice2" } },
    });
    renderAt("/settings");

    const input = await screen.findByLabelText(/^Username/);
    await userEvent.clear(input);
    await userEvent.type(input, "taken");
    await userEvent.click(screen.getByRole("button", { name: "Save username" }));
    expect(await screen.findByText("That username is not allowed.")).toBeInTheDocument();

    await userEvent.clear(input);
    await userEvent.type(input, "alice2");
    await userEvent.click(screen.getByRole("button", { name: "Save username" }));
    expect((await screen.findAllByText("Username updated.")).length).toBeGreaterThan(0);
    expect(
      api.calls.filter((call) => call.method === "PATCH" && call.path === "/api/users/me"),
    ).toHaveLength(2);
  });
});
