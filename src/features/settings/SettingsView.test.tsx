import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppearanceContext } from "../../app/appearance";
import { authWrapper, fakeAuth } from "../../test/authWrapper";
import { REGISTERED } from "../../test/fakeApi";
import { SettingsView } from "./SettingsView";
import { ACCOUNT } from "./settingsTestKit";

vi.mock("../auth/useGoogleAvailable", () => ({ useGoogleAvailable: () => false }));

const Wrapper = authWrapper(fakeAuth(REGISTERED));
const view = (props: Partial<Parameters<typeof SettingsView>[0]> = {}) =>
  render(
    <Wrapper>
      <AppearanceContext.Provider value={{ appearance: "system", setAppearance: vi.fn() }}>
        <SettingsView
          account={ACCOUNT}
          onAccountChanged={vi.fn()}
          onPrivacyChanged={vi.fn()}
          onReload={vi.fn()}
          {...props}
        />
      </AppearanceContext.Provider>
    </Wrapper>,
  );

afterEach(cleanup);

describe("SettingsView", () => {
  it("opens on the account tab, with one panel on screen", () => {
    view();
    expect(screen.getByRole("tab", { name: "Account" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { level: 1, name: "Account settings" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Save username" })).toBeVisible();
    expect(screen.queryByRole("switch", { name: "Make my profile private" })).toBeNull();
  });

  it.each([
    ["Sign-in", "Sign-in methods"],
    ["Privacy", "Privacy"],
    ["Appearance", "Appearance"],
    ["Delete account", "Delete account"],
  ])("the %s tab shows its own section", async (tab, heading) => {
    view();
    await userEvent.click(screen.getByRole("tab", { name: tab }));
    expect(screen.getByRole("tab", { name: tab })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel", { name: tab })).toBeVisible();
    expect(screen.getByRole("heading", { level: 2, name: heading })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Save username" })).toBeNull();
  });

  it("can open on another tab", () => {
    view({ initialTab: "sign-in" });
    expect(screen.getByRole("tab", { name: "Sign-in" })).toHaveAttribute("aria-selected", "true");
  });

  it("offers Add a password to an account without one", () => {
    view({ account: { ...ACCOUNT, authMethods: ["GOOGLE"] } });
    expect(screen.getByRole("heading", { level: 3, name: "Add a password" })).toBeVisible();
  });
});
