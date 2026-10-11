import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NotificationBellView } from "./NotificationBellView";
import type { NotificationBell } from "./useNotificationBell";

vi.mock("./NotificationPanel", () => ({ NotificationPanel: () => <p>panel</p> }));

const bell = (over: Partial<NotificationBell> = {}): NotificationBell => ({
  unread: 0,
  isOpen: false,
  reloadKey: 0,
  setOpen: vi.fn(),
  refresh: vi.fn(),
  ...over,
});

describe("NotificationBellView", () => {
  it("names the unread count for assistive technology", () => {
    render(<NotificationBellView bell={bell({ unread: 3 })} />);
    expect(screen.getByRole("button", { name: "Notifications, 3 unread" })).toBeTruthy();
  });

  it("has a plain name when nothing is unread", () => {
    render(<NotificationBellView bell={bell()} />);
    expect(screen.getByRole("button", { name: "Notifications" })).toBeTruthy();
  });

  it("asks to open from the button and shows the panel while open", async () => {
    const state = bell();
    const { rerender } = render(<NotificationBellView bell={state} />);
    await userEvent.click(screen.getByRole("button", { name: "Notifications" }));
    expect(state.setOpen).toHaveBeenCalledWith(true);
    rerender(<NotificationBellView bell={bell({ isOpen: true })} />);
    expect(screen.getByText("panel")).toBeTruthy();
  });
});
