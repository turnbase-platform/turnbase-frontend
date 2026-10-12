import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LinkProvider } from "@astryxdesign/core/Link";
import { Link } from "react-router";
import type { ReactNode } from "react";
import { ApiError } from "../../shared/api";
import { authWrapper, fakeAuth } from "../../test/authWrapper";
import { LoginView } from "./LoginView";
import { OAuthCompletionView } from "./OAuthCompletionView";
import { RegisterView } from "./RegisterView";
import type { LoginForm } from "./useLoginForm";
import type { OAuthCompletion } from "./useOAuthCompletion";
import type { RegisterForm } from "./useRegisterForm";

afterEach(cleanup);

function inShell(node: ReactNode) {
  const Wrapper = authWrapper(fakeAuth());
  render(
    <Wrapper>
      <LinkProvider component={Link}>{node}</LinkProvider>
    </Wrapper>,
  );
}

const login = (over: Partial<LoginForm> = {}): LoginForm => ({
  usernameOrEmail: "",
  setUsernameOrEmail: vi.fn(),
  password: "",
  setPassword: vi.fn(),
  error: null,
  isBusy: false,
  submit: vi.fn((event: { preventDefault: () => void }) => {
    event.preventDefault();
  }),
  google: false,
  redirect: null,
  oauthFailed: false,
  ...over,
});

describe("LoginView", () => {
  it("has the two credential fields, the submit and a link to registration", () => {
    inShell(<LoginView form={login()} />);
    expect(screen.getByRole("heading", { level: 1, name: "Welcome back" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Username or email/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log in" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create an account" })).toHaveAttribute(
      "href",
      "/register",
    );
    expect(screen.queryByRole("link", { name: /Google/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Play as Guest" })).toBeInTheDocument();
  });

  it("offers Google only when the deployment does, and carries the redirect on", () => {
    inShell(<LoginView form={login({ google: true, redirect: "/rooms/x" })} />);
    expect(screen.getByRole("link", { name: /Google/ })).toHaveAttribute(
      "href",
      "/auth/google?redirect=%2Frooms%2Fx",
    );
    expect(screen.getByRole("link", { name: "Create an account" })).toHaveAttribute(
      "href",
      "/register?redirect=%2Frooms%2Fx",
    );
  });

  it("explains a failed Google sign-in and a rejected password", () => {
    inShell(
      <LoginView form={login({ oauthFailed: true, error: new ApiError(401, { status: 401 }) })} />,
    );
    expect(screen.getByText(/Google sign-in did not complete/)).toBeInTheDocument();
    expect(screen.getByText("Incorrect username, email or password.")).toBeInTheDocument();
  });

  it("hands the typed values and the submit to the hook", async () => {
    const form = login();
    inShell(<LoginView form={form} />);
    await userEvent.type(screen.getByLabelText(/Username or email/), "a");
    expect(vi.mocked(form.setUsernameOrEmail).mock.calls[0]?.[0]).toBe("a");
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));
    expect(form.submit).toHaveBeenCalledOnce();
  });
});

const register = (over: Partial<RegisterForm> = {}): RegisterForm => ({
  username: "",
  setUsername: vi.fn(),
  email: "",
  setEmail: vi.fn(),
  password: "",
  setPassword: vi.fn(),
  confirmPassword: "",
  setConfirmPassword: vi.fn(),
  mismatch: undefined,
  error: null,
  isBusy: false,
  submit: vi.fn(),
  google: false,
  redirect: null,
  ...over,
});

describe("RegisterView", () => {
  it("has the four fields and a link back to login", () => {
    inShell(<RegisterView form={register()} />);
    for (const name of [/Username/, /Email/, /^Password/, /Confirm password/]) {
      expect(screen.getByLabelText(name)).toBeInTheDocument();
    }
    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login");
  });

  it("shows the mismatch on the confirmation field", () => {
    inShell(
      <RegisterView
        form={register({ mismatch: { type: "error", message: "Passwords do not match." } })}
      />,
    );
    expect(screen.getByText("Passwords do not match.")).toBeInTheDocument();
  });

  it("puts a server field error on its own field", () => {
    const error = new ApiError(400, {
      status: 400,
      errors: [{ field: "username", message: "That username is taken." }],
    });
    inShell(<RegisterView form={register({ error })} />);
    expect(screen.getByText("That username is taken.")).toBeInTheDocument();
  });
});

const oauth = (over: Partial<OAuthCompletion> = {}): OAuthCompletion => ({
  pending: { state: "ready", email: "a@example.com" },
  email: "a@example.com",
  username: "",
  setUsername: vi.fn(),
  error: null,
  collision: false,
  isBusy: false,
  submit: vi.fn(),
  ...over,
});

describe("OAuthCompletionView", () => {
  it("shows the provider email read-only beside the username field", () => {
    inShell(<OAuthCompletionView form={oauth()} />);
    expect(screen.getByLabelText(/Email/)).toHaveValue("a@example.com");
    expect(screen.getByLabelText(/Email/)).toHaveAttribute("readonly");
    expect(screen.getByRole("button", { name: "Create account" })).toBeInTheDocument();
  });

  it("points a collision at the password login", () => {
    inShell(<OAuthCompletionView form={oauth({ collision: true })} />);
    expect(screen.getByText(/already has a TurnBase account/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login");
  });
});
