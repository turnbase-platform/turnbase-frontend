import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NotificationPanelView } from "./NotificationPanelView";
import type { NotificationItem } from "./notificationsApi";
import type { NotificationPanelState } from "./useNotificationPanel";

const item = (over: Partial<NotificationItem>): NotificationItem => ({
  notificationId: "n-1",
  type: "FRIEND_REQUEST",
  payload: { username: "carol" },
  createdAt: "2026-09-14T09:00:00Z",
  readAt: null,
  ...over,
});

const panel = (over: Partial<NotificationPanelState> = {}): NotificationPanelState => ({
  items: [item({})],
  loaded: true,
  failed: false,
  hasMore: false,
  canRespond: true,
  retry: vi.fn(),
  loadMore: vi.fn(),
  markAllRead: vi.fn(),
  accept: vi.fn(),
  decline: vi.fn(),
  markRead: vi.fn(),
  dismiss: vi.fn(),
  ...over,
});

describe("NotificationPanelView", () => {
  it("hands each action the row it belongs to", async () => {
    const state = panel();
    render(<NotificationPanelView panel={state} />);
    expect(screen.getByText("carol sent you a friend request.")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Accept" }));
    await userEvent.click(screen.getByRole("button", { name: "Decline" }));
    await userEvent.click(screen.getByRole("button", { name: "Mark read" }));
    await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    await userEvent.click(screen.getByRole("button", { name: "Mark all read" }));
    expect(state.accept).toHaveBeenCalledWith(state.items[0]);
    expect(state.decline).toHaveBeenCalledWith(state.items[0]);
    expect(state.markRead).toHaveBeenCalledWith(state.items[0]);
    expect(state.dismiss).toHaveBeenCalledWith(state.items[0]);
    expect(state.markAllRead).toHaveBeenCalled();
  });

  it("calls an invitation's accept action Join", () => {
    render(
      <NotificationPanelView
        panel={panel({
          items: [item({ type: "ROOM_INVITATION", payload: { hostUsername: "bob" } })],
        })}
      />,
    );
    expect(screen.getByRole("button", { name: "Join" })).toBeTruthy();
  });

  it("gives a Guest no Accept or Decline, and a read row no Mark read", () => {
    render(
      <NotificationPanelView
        panel={panel({ canRespond: false, items: [item({ readAt: "2026-09-14T10:00:00Z" })] })}
      />,
    );
    expect(screen.queryByRole("button", { name: "Accept" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Decline" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Mark read" })).toBeNull();
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeTruthy();
  });

  it("marks unread rows in the DOM", () => {
    render(<NotificationPanelView panel={panel()} />);
    expect(screen.getByRole("listitem").getAttribute("data-unread")).toBe("true");
  });

  it("says when there is nothing, but not before the first load", () => {
    const { rerender } = render(
      <NotificationPanelView panel={panel({ items: [], loaded: false })} />,
    );
    expect(screen.queryByText("All caught up. Nothing needs your turn.")).toBeNull();
    rerender(<NotificationPanelView panel={panel({ items: [] })} />);
    expect(screen.getByText("All caught up. Nothing needs your turn.")).toBeTruthy();
  });

  it("offers Retry on failure and Load more when there is another page", async () => {
    const state = panel({ failed: true, hasMore: true });
    render(<NotificationPanelView panel={state} />);
    expect(screen.queryByText("All caught up. Nothing needs your turn.")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    await userEvent.click(screen.getByRole("button", { name: "Load more" }));
    expect(state.retry).toHaveBeenCalled();
    expect(state.loadMore).toHaveBeenCalled();
  });
});
