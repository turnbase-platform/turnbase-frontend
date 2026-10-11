import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthMethodsView } from "./AuthMethodsView";
import type { AuthMethods } from "./useAuthMethods";

const auth = (over: Partial<AuthMethods> = {}): AuthMethods => ({
  methods: ["PASSWORD", "GOOGLE"],
  canRemove: true,
  canLinkGoogle: false,
  isBusy: false,
  remove: vi.fn(),
  ...over,
});

describe("AuthMethodsView", () => {
  it("lists the methods and removes the one chosen", async () => {
    const state = auth();
    render(<AuthMethodsView auth={state} />);
    expect(screen.getByText("Password")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Remove Google" }));
    expect(state.remove).toHaveBeenCalledWith("GOOGLE");
  });

  it("offers no Remove for the only method", () => {
    render(<AuthMethodsView auth={auth({ methods: ["PASSWORD"], canRemove: false })} />);
    expect(screen.queryByRole("button", { name: /^Remove/ })).toBeNull();
  });

  it("links Google through the server's redirect", () => {
    render(<AuthMethodsView auth={auth({ canLinkGoogle: true })} />);
    expect(screen.getByRole("link", { name: "Link Google account" })).toHaveAttribute(
      "href",
      "/auth/google?intent=link",
    );
  });
});
