import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeleteAccountView } from "./DeleteAccountView";
import type { DeleteAccount } from "./useDeleteAccount";

const state = (over: Partial<DeleteAccount> = {}): DeleteAccount => ({
  needsPassword: true,
  password: "",
  setPassword: vi.fn(),
  isOpen: false,
  setIsOpen: vi.fn(),
  isBusy: false,
  confirm: vi.fn(),
  ...over,
});

describe("DeleteAccountView", () => {
  it("cannot be started until the password is typed", () => {
    render(<DeleteAccountView account={state()} />);
    expect(screen.getByRole("button", { name: "Delete my account" })).toBeDisabled();
  });

  it("needs no password for an account without one", async () => {
    const account = state({ needsPassword: false });
    render(<DeleteAccountView account={account} />);
    expect(screen.queryByLabelText(/password/i)).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Delete my account" }));
    expect(account.setIsOpen).toHaveBeenCalledWith(true);
    expect(account.confirm).not.toHaveBeenCalled();
  });

  it("confirms from the dialog", async () => {
    const account = state({ password: "pw", isOpen: true });
    render(<DeleteAccountView account={account} />);
    const dialog = await screen.findByRole("alertdialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete account" }));
    expect(account.confirm).toHaveBeenCalled();
  });
});
