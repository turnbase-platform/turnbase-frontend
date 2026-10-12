import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  FakeEventSource,
  ANONYMOUS,
  GUEST,
  REGISTERED,
  UNAUTHORIZED,
  installFakeApi,
  type FakeReply,
} from "../test/fakeApi";
import { renderAt, where } from "../test/renderApp";
import { onUnauthorized } from "../shared/api";

const session = (reply: FakeReply) => ({ "GET /api/auth/session": reply });
const signedInAs = (principal: typeof REGISTERED | typeof GUEST) => ({
  ...session({ body: principal }),
  "GET /api/notifications/unread-count": { body: { unreadCount: 0 } },
});
const unauth = {
  ...session(ANONYMOUS),
  "GET /api/auth/providers": { body: { google: false } },
};

beforeEach(() => {
  FakeEventSource.reset();
  vi.stubGlobal("EventSource", FakeEventSource);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("shell", () => {
  it("mounts Theme and LinkProvider: an Astryx link navigates without a page load", async () => {
    installFakeApi(unauth);
    renderAt("/");
    // The document is the same object before and after: a full reload would replace it.
    const marker = document.createElement("meta");
    document.head.append(marker);

    await userEvent.click(await screen.findByRole("link", { name: "Games" }));

    expect(where()).toBe("/games");
    expect(marker.isConnected).toBe(true);
    expect(document.documentElement).toHaveAttribute("data-astryx-theme");
  });
});

describe("navigation bar (VW-NAV-001…012, NFR-USAB-001)", () => {
  it("Unauth: catalog, Log in, Create account, Play as Guest — and nothing gated", async () => {
    installFakeApi(unauth);
    renderAt("/");
    const nav = await screen.findByRole("navigation", { name: "Main" });

    expect(within(nav).getByRole("link", { name: "Games" })).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: "Log in" })).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: "Create account" })).toBeInTheDocument();
    expect(within(nav).getByRole("button", { name: "Play as Guest" })).toBeInTheDocument();
    // Removed from the DOM, not disabled.
    for (const name of ["Rooms", "Friends"]) {
      expect(within(nav).queryByRole("link", { name })).toBeNull();
    }
    expect(within(nav).queryByRole("button", { name: /Notifications/ })).toBeNull();
    expect(FakeEventSource.instances).toHaveLength(0);
  });

  it("marks the current section with aria-current and the sliding highlight", async () => {
    installFakeApi(signedInAs(REGISTERED));
    renderAt("/rooms");
    const nav = await screen.findByRole("navigation", { name: "Main" });

    expect(await within(nav).findByRole("link", { name: "Rooms" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(nav).getByRole("link", { name: "Games" })).not.toHaveAttribute("aria-current");
  });

  it("Guest: rooms, bell and user menu; no Friends and no Settings", async () => {
    installFakeApi(signedInAs(GUEST));
    renderAt("/");
    const nav = await screen.findByRole("navigation", { name: "Main" });

    expect(await within(nav).findByRole("link", { name: "Rooms" })).toBeInTheDocument();
    expect(within(nav).getByRole("button", { name: /Notifications/ })).toBeInTheDocument();
    expect(within(nav).queryByRole("link", { name: "Friends" })).toBeNull();
    expect(within(nav).queryByRole("link", { name: "Log in" })).toBeNull();
    expect(within(nav).queryByRole("button", { name: "Play as Guest" })).toBeNull();

    await userEvent.click(within(nav).getByRole("button", { name: `${GUEST.username} menu` }));
    expect(await screen.findByRole("menuitem", { name: "Profile" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Replay the tour" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Leave as guest" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Settings" })).toBeNull();
  });

  it("Registered: Friends and Settings as well, with Light / Dark / Auto in the menu", async () => {
    installFakeApi(signedInAs(REGISTERED));
    renderAt("/");
    const nav = await screen.findByRole("navigation", { name: "Main" });

    expect(await within(nav).findByRole("link", { name: "Friends" })).toBeInTheDocument();
    await userEvent.click(within(nav).getByRole("button", { name: `${REGISTERED.username} menu` }));
    expect(await screen.findByRole("menuitem", { name: "Settings" })).toBeInTheDocument();
    for (const name of ["Light", "Dark", "Auto"]) {
      expect(screen.getByRole("menuitemradio", { name })).toBeInTheDocument();
    }
  });

  it("Sign out ends the session and returns to the landing page as Unauth", async () => {
    const { calls } = installFakeApi({
      ...signedInAs(REGISTERED),
      "POST /api/auth/logout": { status: 204 },
    });
    renderAt("/rooms");
    await userEvent.click(
      await screen.findByRole("button", { name: `${REGISTERED.username} menu` }),
    );
    await userEvent.click(await screen.findByRole("menuitem", { name: "Sign out" }));

    await waitFor(() => {
      expect(where()).toBe("/");
    });
    expect(calls.some((call) => call.method === "POST" && call.path === "/api/auth/logout")).toBe(
      true,
    );
    const nav = await screen.findByRole("navigation", { name: "Main" });
    expect(await within(nav).findByRole("link", { name: "Log in" })).toBeInTheDocument();
  });

  it("Play as Guest mints a guest and lands on /rooms (VW-REDIR-004)", async () => {
    installFakeApi({ ...unauth, "POST /api/auth/guest": { status: 201, body: GUEST } });
    renderAt("/");
    const nav = await screen.findByRole("navigation", { name: "Main" });
    await userEvent.click(within(nav).getByRole("button", { name: "Play as Guest" }));

    await waitFor(() => {
      expect(where()).toBe("/rooms");
    });
  });
});

describe("Play as Guest rate limit", () => {
  it("a 429 toasts the wait from Retry-After", async () => {
    installFakeApi({
      ...unauth,
      "POST /api/auth/guest": {
        status: 429,
        headers: { "Retry-After": "3000" },
        body: { status: 429 },
      },
    });
    renderAt("/");
    const nav = await screen.findByRole("navigation", { name: "Main" });
    await userEvent.click(within(nav).getByRole("button", { name: "Play as Guest" }));
    expect((await screen.findAllByText(/try again in 50 minutes/)).length).toBeGreaterThan(0);
  });
});

describe("landing page (VW-LAND-001…004)", () => {
  it("shows the description and the three calls to action to Unauth", async () => {
    installFakeApi(unauth);
    renderAt("/");
    const main = await screen.findByRole("main");

    expect(within(main).getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(within(main).getByRole("link", { name: "Log in" })).toBeInTheDocument();
    expect(within(main).getByRole("link", { name: "Register" })).toBeInTheDocument();
    expect(within(main).getByRole("button", { name: "Play as Guest" })).toBeInTheDocument();
  });

  it("removes the calls to action for a signed-in visitor but keeps the description", async () => {
    installFakeApi(signedInAs(REGISTERED));
    renderAt("/");
    const main = await screen.findByRole("main");

    await waitFor(() => {
      expect(within(main).queryByRole("link", { name: "Log in" })).toBeNull();
    });
    expect(within(main).queryByRole("link", { name: "Register" })).toBeNull();
    expect(within(main).queryByRole("button", { name: "Play as Guest" })).toBeNull();
    expect(within(main).getByRole("heading", { level: 1 })).toBeInTheDocument();
  });
});

describe("route tiers", () => {
  it("VW-REDIR-002: Unauth on an auth-required route goes to /login with the original path", async () => {
    installFakeApi(unauth);
    renderAt("/rooms/abc?tab=chat");
    await waitFor(() => {
      expect(where()).toBe("/login?redirect=%2Frooms%2Fabc%3Ftab%3Dchat");
    });
  });

  it.each(["/rooms", "/rooms/abc", "/rooms/join/XYZ"])("%s needs a session", async (path) => {
    installFakeApi(unauth);
    renderAt(path);
    await waitFor(() => {
      expect(where()).toContain("/login?redirect=");
    });
  });

  it.each(["/friends", "/settings"])(
    "VW-REDIR-003: a Guest on %s sees the registered-account message",
    async (path) => {
      installFakeApi(signedInAs(GUEST));
      renderAt(path);
      expect(
        await screen.findByText("This feature requires a registered account."),
      ).toBeInTheDocument();
      expect(where()).toBe(path);
    },
  );

  it.each(["/friends", "/settings"])("%s renders for a Registered user", async (path) => {
    installFakeApi(signedInAs(REGISTERED));
    renderAt(path);
    expect(await screen.findByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.queryByText("This feature requires a registered account.")).toBeNull();
    expect(where()).toBe(path);
  });

  it.each(["/friends", "/settings"])("Unauth on %s logs in first", async (path) => {
    installFakeApi(unauth);
    renderAt(path);
    await waitFor(() => {
      expect(where()).toBe(`/login?redirect=${encodeURIComponent(path)}`);
    });
  });

  it.each(["/", "/games", "/games/g-1", "/users/alice"])("%s is public", async (path) => {
    installFakeApi(unauth);
    renderAt(path);
    await screen.findByRole("main");
    expect(where()).toBe(path);
  });

  it.each(["/login", "/register"])(
    "VW-REDIR-001: an authenticated visitor on %s goes to /rooms",
    async (path) => {
      installFakeApi(signedInAs(GUEST));
      renderAt(path);
      await waitFor(() => {
        expect(where()).toBe("/rooms");
      });
    },
  );

  it("does not bounce a signed-in visitor through /login while the session is still loading", async () => {
    installFakeApi(signedInAs(REGISTERED));
    renderAt("/friends");
    expect(await screen.findByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(where()).toBe("/friends");
  });

  it("an unknown path renders the not-found view", async () => {
    installFakeApi(unauth);
    renderAt("/no/such/place");
    expect(await screen.findByRole("heading", { name: "Page not found" })).toBeInTheDocument();
  });

  it("VW-OAUTHCOMP: /auth/complete-registration is a shell route, not a redirect target", async () => {
    installFakeApi({
      ...unauth,
      "GET /api/auth/oauth/pending": { body: { email: "a@example.com" } },
    });
    renderAt("/auth/complete-registration");
    expect(await screen.findByRole("heading", { name: "Choose a username" })).toBeInTheDocument();
  });
});

describe("the startup session probe (AUD-24)", () => {
  it("hears a 401 as 'no session', not as a session that ended mid-use", async () => {
    // A visitor whose cookie is stale: the platform names the rejection with a 401 (FR-SESS-004).
    const heard = vi.fn();
    const stop = onUnauthorized(heard);
    installFakeApi({ ...unauth, ...session(UNAUTHORIZED) });
    renderAt("/");
    expect((await screen.findAllByText("Log in")).length).toBeGreaterThan(0);
    stop();
    expect(heard).not.toHaveBeenCalled();
  });
});

describe("VW-REDIR-007: a mid-session 401", () => {
  it("redirects to /login?redirect=<current> instead of blanking the view", async () => {
    let calls = 0;
    installFakeApi({
      ...signedInAs(REGISTERED),
      "GET /api/notifications/unread-count": () => {
        calls += 1;
        return calls === 1 ? { body: { unreadCount: 0 } } : UNAUTHORIZED;
      },
    });
    renderAt("/friends");
    const bell = await screen.findByRole("button", { name: /Notifications/ });

    await userEvent.click(bell); // refreshes the count → 401

    await waitFor(() => {
      expect(where()).toBe("/login?redirect=%2Ffriends");
    });
    expect(await screen.findByRole("heading", { name: "Log in" })).toBeInTheDocument();
  });
});

describe("login (VW-LOGIN-001…004)", () => {
  it("marks the credential fields for password managers (autocomplete)", async () => {
    installFakeApi(unauth);
    renderAt("/login");
    expect(await screen.findByLabelText(/^Password/)).toHaveAttribute(
      "autocomplete",
      "current-password",
    );
    expect(screen.getByLabelText(/Username or email/i)).toHaveAttribute("autocomplete", "username");
  });

  async function logIn() {
    await userEvent.type(await screen.findByLabelText(/Username or email/), "alice");
    await userEvent.type(screen.getByLabelText(/^Password/), "hunter2!");
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));
  }

  const loginRoutes = (extra: Record<string, FakeReply> = {}) => ({
    ...unauth,
    "POST /api/auth/login": { body: REGISTERED },
    "GET /api/notifications/unread-count": { body: { unreadCount: 0 } },
    ...extra,
  });

  it("posts the documented body", async () => {
    const { calls } = installFakeApi(loginRoutes());
    renderAt("/login");
    await logIn();
    await waitFor(() => {
      expect(where()).toBe("/rooms");
    });
    const login = calls.find((call) => call.path === "/api/auth/login");
    expect(login?.body).toEqual({ usernameOrEmail: "alice", password: "hunter2!" });
  });

  it("VW-REDIR-005: honours a valid internal redirect", async () => {
    installFakeApi(loginRoutes());
    renderAt("/login?redirect=%2Frooms%2Fabcd%3Ftab%3Dchat");
    await logIn();
    await waitFor(() => {
      expect(where()).toBe("/rooms/abcd?tab=chat");
    });
  });

  it.each([
    ["an absolute URL", "https%3A%2F%2Fevil.example"],
    ["a protocol-relative URL", "%2F%2Fevil.example"],
    ["a backslash trick", "%2F%5Cevil.example"],
  ])("VW-REDIR-006: %s falls back to /rooms", async (_name, redirect) => {
    installFakeApi(loginRoutes());
    renderAt(`/login?redirect=${redirect}`);
    await logIn();
    await waitFor(() => {
      expect(where()).toBe("/rooms");
    });
  });

  it("a wrong password is a form error, not an ended session", async () => {
    installFakeApi(loginRoutes({ "POST /api/auth/login": UNAUTHORIZED }));
    renderAt("/login");
    await logIn();
    expect(await screen.findByText("Incorrect username, email or password.")).toBeInTheDocument();
    expect(where()).toBe("/login");
  });

  it("shows the server's per-field validation messages", async () => {
    installFakeApi(
      loginRoutes({
        "POST /api/auth/login": {
          status: 400,
          body: { errors: [{ field: "password", message: "Password is required." }] },
        },
      }),
    );
    renderAt("/login");
    await logIn();
    expect(await screen.findByText("Password is required.")).toBeInTheDocument();
  });

  it("links to registration (VW-LOGIN-003)", async () => {
    installFakeApi(unauth);
    renderAt("/login");
    const main = await screen.findByRole("main");
    expect(within(main).getByRole("link", { name: "Register" })).toHaveAttribute(
      "href",
      "/register",
    );
  });

  it("renders the OAuth failure flag as an error", async () => {
    installFakeApi(unauth);
    renderAt("/login?oauthError=1");
    expect(await screen.findByText(/Google sign-in did not complete/)).toBeInTheDocument();
  });
});

describe("Google buttons (VW-LOGIN-002, VW-REG-002, IMP-GATE-76)", () => {
  it.each(["/login", "/register"])(
    "%s: shown only when the deployment configures Google",
    async (path) => {
      installFakeApi({
        ...session(UNAUTHORIZED),
        "GET /api/auth/providers": { body: { google: true } },
      });
      renderAt(path);
      const link = await screen.findByRole("link", { name: "Continue with Google" });
      // A plain anchor: the monolith answers /auth/google, the router must not take it.
      expect(link).toHaveAttribute("href", "/auth/google");
    },
  );

  it.each(["/login", "/register"])("%s: absent when Google is not configured", async (path) => {
    installFakeApi(unauth);
    renderAt(path);
    await screen.findByRole("heading", { level: 1 });
    expect(screen.queryByRole("link", { name: "Continue with Google" })).toBeNull();
  });

  it("absent when the providers request fails", async () => {
    installFakeApi({ ...session(UNAUTHORIZED), "GET /api/auth/providers": { status: 500 } });
    renderAt("/login");
    await screen.findByRole("heading", { level: 1 });
    expect(screen.queryByRole("link", { name: "Continue with Google" })).toBeNull();
  });

  it("forwards only a validated redirect to /auth/google", async () => {
    installFakeApi({
      ...session(UNAUTHORIZED),
      "GET /api/auth/providers": { body: { google: true } },
    });
    renderAt("/login?redirect=%2Frooms%2Fabcd");
    expect(await screen.findByRole("link", { name: "Continue with Google" })).toHaveAttribute(
      "href",
      "/auth/google?redirect=%2Frooms%2Fabcd",
    );
  });

  it("replaces an external redirect with the default before forwarding it", async () => {
    installFakeApi({
      ...session(UNAUTHORIZED),
      "GET /api/auth/providers": { body: { google: true } },
    });
    renderAt("/login?redirect=%2F%2Fevil.example");
    expect(await screen.findByRole("link", { name: "Continue with Google" })).toHaveAttribute(
      "href",
      "/auth/google?redirect=%2Frooms",
    );
  });
});

describe("registration (VW-REG-001…003)", () => {
  it("posts the documented body and lands on /rooms as the new user", async () => {
    const { calls } = installFakeApi({
      ...unauth,
      "POST /api/auth/register": { status: 201, body: REGISTERED },
      "GET /api/notifications/unread-count": { body: { unreadCount: 0 } },
    });
    renderAt("/register");
    await userEvent.type(await screen.findByLabelText(/^Username/), "alice");
    await userEvent.type(screen.getByLabelText(/^Email/), "alice@example.com");
    await userEvent.type(screen.getByLabelText(/^Password/), "hunter2!hunter2!");
    await userEvent.type(screen.getByLabelText(/^Confirm password/), "hunter2!hunter2!");
    await userEvent.click(screen.getByRole("button", { name: "Register" }));

    await waitFor(() => {
      expect(where()).toBe("/rooms");
    });
    expect(calls.find((call) => call.path === "/api/auth/register")?.body).toEqual({
      username: "alice",
      email: "alice@example.com",
      password: "hunter2!hunter2!",
      confirmPassword: "hunter2!hunter2!",
    });
  });

  it("does not submit while the passwords differ", async () => {
    const { calls } = installFakeApi(unauth);
    renderAt("/register");
    await userEvent.type(await screen.findByLabelText(/^Password/), "one");
    await userEvent.type(screen.getByLabelText(/^Confirm password/), "two");
    await userEvent.click(screen.getByRole("button", { name: "Register" }));

    expect((await screen.findAllByText("Passwords do not match.")).length).toBeGreaterThan(0);
    expect(calls.some((call) => call.path === "/api/auth/register")).toBe(false);
  });

  it("shows a taken username against its field", async () => {
    installFakeApi({
      ...unauth,
      "POST /api/auth/register": {
        status: 400,
        body: { errors: [{ field: "username", message: "That username is taken." }] },
      },
    });
    renderAt("/register");
    await userEvent.type(await screen.findByLabelText(/^Username/), "alice");
    await userEvent.click(screen.getByRole("button", { name: "Register" }));
    expect(await screen.findByText("That username is taken.")).toBeInTheDocument();
  });

  it("a 429 names the wait from Retry-After, not 'a moment' (RR-10)", async () => {
    installFakeApi({
      ...unauth,
      "POST /api/auth/register": {
        status: 429,
        headers: { "Retry-After": "806" },
        body: { type: "rate-limit-exceeded", status: 429 },
      },
    });
    renderAt("/register");
    await userEvent.type(await screen.findByLabelText(/^Username/), "alice");
    await userEvent.click(screen.getByRole("button", { name: "Register" }));
    expect(
      await screen.findByText("Too many attempts. Please try again in 14 minutes."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/a moment/)).toBeNull();
  });

  it("a 429 on login shows the wait too", async () => {
    installFakeApi({
      ...unauth,
      "POST /api/auth/login": {
        status: 429,
        headers: { "Retry-After": "30" },
        body: { status: 429 },
      },
    });
    renderAt("/login");
    await userEvent.type(await screen.findByLabelText(/Username or email/), "alice");
    await userEvent.type(screen.getByLabelText(/^Password/), "x");
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));
    expect(
      await screen.findByText("Too many attempts. Please try again in 30 seconds."),
    ).toBeInTheDocument();
  });

  it("links to login (VW-REG-003)", async () => {
    installFakeApi(unauth);
    renderAt("/register");
    const main = await screen.findByRole("main");
    expect(within(main).getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login");
  });
});

describe("OAuth registration completion (VW-OAUTHCOMP-001…002)", () => {
  it("shows the provider email read-only and creates the account", async () => {
    const { calls } = installFakeApi({
      ...unauth,
      "GET /api/auth/oauth/pending": { body: { email: "alice@example.com" } },
      "POST /api/auth/oauth/complete-registration": { status: 201, body: REGISTERED },
      "GET /api/notifications/unread-count": { body: { unreadCount: 0 } },
    });
    renderAt("/auth/complete-registration");

    const email = await screen.findByLabelText(/^Email/);
    expect(email).toHaveValue("alice@example.com");
    expect(email).toHaveAttribute("readonly");

    await userEvent.type(screen.getByLabelText(/^Username/), "alice");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => {
      expect(where()).toBe("/rooms");
    });
    expect(calls.find((call) => call.path.endsWith("complete-registration"))?.body).toEqual({
      username: "alice",
    });
  });

  it("direct access without a pending registration goes to /login", async () => {
    installFakeApi({ ...unauth, "GET /api/auth/oauth/pending": { status: 404 } });
    renderAt("/auth/complete-registration");
    await waitFor(() => {
      expect(where()).toBe("/login");
    });
  });

  it("tells the user when the email already has an account", async () => {
    installFakeApi({
      ...unauth,
      "GET /api/auth/oauth/pending": { body: { email: "alice@example.com" } },
      "POST /api/auth/oauth/complete-registration": { body: { outcome: "CHALLENGE_REQUIRED" } },
    });
    renderAt("/auth/complete-registration");
    await userEvent.type(await screen.findByLabelText(/^Username/), "alice");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(
      await screen.findByText("This email already has a TurnBase account."),
    ).toBeInTheDocument();
  });

  it("returns to /login if the pending registration expired while the form was open", async () => {
    installFakeApi({
      ...unauth,
      "GET /api/auth/oauth/pending": { body: { email: "alice@example.com" } },
      "POST /api/auth/oauth/complete-registration": { status: 404 },
    });
    renderAt("/auth/complete-registration");
    await userEvent.type(await screen.findByLabelText(/^Username/), "alice");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() => {
      expect(where()).toBe("/login");
    });
  });
});

describe("notifications (shell-architecture.md §7)", () => {
  it("opens one stream per tab for a signed-in visitor, and closes it on logout", async () => {
    installFakeApi({ ...signedInAs(REGISTERED), "POST /api/auth/logout": { status: 204 } });
    renderAt("/rooms");
    await screen.findByRole("button", { name: /Notifications/ });

    expect(FakeEventSource.instances).toHaveLength(1);
    expect(FakeEventSource.instances[0]?.url).toBe("/api/notifications/stream");

    await userEvent.click(screen.getByRole("button", { name: `${REGISTERED.username} menu` }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Sign out" }));
    await waitFor(() => {
      expect(FakeEventSource.instances[0]?.closed).toBe(true);
    });
  });

  it("reads the unread badge from the API, refreshing on each pushed notification", async () => {
    let unread = 2;
    installFakeApi({
      ...signedInAs(REGISTERED),
      "GET /api/notifications/unread-count": () => ({ body: { unreadCount: unread } }),
    });
    renderAt("/rooms");
    expect(
      await screen.findByRole("button", { name: "Notifications, 2 unread" }),
    ).toBeInTheDocument();

    unread = 3;
    FakeEventSource.instances[0]?.emit("notification", {
      type: "FRIEND_REQUEST",
      notificationId: "n-1",
    });
    expect(
      await screen.findByRole("button", { name: "Notifications, 3 unread" }),
    ).toBeInTheDocument();
  });

  it("shows an alert as a toast and does not add it to the badge", async () => {
    installFakeApi(signedInAs(REGISTERED));
    renderAt("/rooms");
    await screen.findByRole("button", { name: /Notifications/ });

    FakeEventSource.instances[0]?.emit("alert", { type: "INVITATION_ACCEPTED", user: "bob" });

    expect(await screen.findByText("bob accepted your invitation.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /unread/ })).toBeNull();
  });

  it("SESSION_DISPLACED shows the alert, then goes to /login", async () => {
    installFakeApi(signedInAs(REGISTERED));
    renderAt("/rooms");
    await screen.findByRole("button", { name: /Notifications/ });

    FakeEventSource.instances[0]?.emit("alert", { type: "SESSION_DISPLACED" });

    await waitFor(() => {
      expect(where()).toMatch(/^\/login/);
    });
    expect(
      (await screen.findAllByText(/signed out because your account signed in on another device/))
        .length,
    ).toBeGreaterThan(0);
  });
});
