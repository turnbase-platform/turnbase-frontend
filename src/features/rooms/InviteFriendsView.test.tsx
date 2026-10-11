import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InviteFriendsView } from "./InviteFriendsView";
import type { InviteFriends } from "./useInviteFriends";

const invite = (over: Partial<InviteFriends> = {}): InviteFriends => ({
  available: true,
  isOpen: true,
  isBusy: false,
  friends: { status: "ready", items: [{ userId: "u-2", username: "bob" }] },
  selected: [],
  failures: [],
  setIsOpen: vi.fn(),
  setSelected: vi.fn(),
  open: vi.fn(),
  send: vi.fn(),
  ...over,
});

describe("InviteFriendsView", () => {
  it("renders nothing for a Guest", () => {
    const { container } = render(<InviteFriendsView invite={invite({ available: false })} />);
    expect(container.textContent).toBe("");
  });

  it("opens the picker from the button", async () => {
    const state = invite({ isOpen: false });
    render(<InviteFriendsView invite={state} />);
    await userEvent.click(screen.getByRole("button", { name: "Invite friends" }));
    expect(state.open).toHaveBeenCalled();
  });

  it("lists the friends and sends the selection", async () => {
    const state = invite({ selected: ["bob"] });
    render(<InviteFriendsView invite={state} />);
    expect(screen.getByLabelText("bob")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Send invitations" }));
    expect(state.send).toHaveBeenCalled();
  });

  it("disables Send until a friend is chosen", () => {
    render(<InviteFriendsView invite={invite()} />);
    expect(screen.getByRole("button", { name: "Send invitations" }).hasAttribute("disabled")).toBe(
      true,
    );
  });

  it.each([
    [{ status: "loading" }, "Loading your friends…"],
    [{ status: "error" }, "Could not load your friends. Please try again."],
    [{ status: "ready", items: [] }, /no friends to invite yet/],
  ] as const)("shows %j", (friends, text) => {
    render(<InviteFriendsView invite={invite({ friends: friends as InviteFriends["friends"] })} />);
    expect(screen.getByText(text)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Send invitations" })).toBeNull();
  });

  it("shows why an invitation failed", () => {
    render(
      <InviteFriendsView invite={invite({ failures: ["bob: you can only invite friends."] })} />,
    );
    expect(screen.getByText("bob: you can only invite friends.")).toBeTruthy();
  });
});
