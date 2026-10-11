import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { FriendsView } from "./FriendsView";
import type { PendingRequest } from "./friends-types";
import type { Friends } from "./useFriends";

const incomingRequest: PendingRequest = {
  requestId: "r-1",
  direction: "INCOMING",
  counterpartUsername: "carol",
  createdAt: "now",
  expiresAt: "later",
};
const sentRequest: PendingRequest = {
  ...incomingRequest,
  requestId: "r-2",
  direction: "OUTGOING",
  counterpartUsername: "dan",
};

const friends = (over: Partial<Friends> = {}): Friends => ({
  friends: { status: "ready", items: [{ userId: "u-2", username: "bob" }] },
  requests: { status: "ready", items: [incomingRequest, sentRequest] },
  incoming: [incomingRequest],
  outgoing: [sentRequest],
  reloadFriends: vi.fn(),
  reloadRequests: vi.fn(),
  accept: vi.fn(),
  decline: vi.fn(),
  cancel: vi.fn(),
  remove: vi.fn(),
  ...over,
});

const view = (state: Friends) =>
  render(
    <MemoryRouter>
      <FriendsView friends={state} />
    </MemoryRouter>,
  );

describe("FriendsView", () => {
  it("hands each row's action the row it belongs to", async () => {
    const state = friends();
    view(state);
    await userEvent.click(screen.getByRole("button", { name: "Accept carol" }));
    await userEvent.click(screen.getByRole("button", { name: "Decline carol" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel request to dan" }));
    await userEvent.click(screen.getByRole("button", { name: "Remove bob" }));
    expect(state.accept).toHaveBeenCalledWith(incomingRequest);
    expect(state.decline).toHaveBeenCalledWith(incomingRequest);
    expect(state.cancel).toHaveBeenCalledWith(sentRequest);
    expect(state.remove).toHaveBeenCalledWith({ userId: "u-2", username: "bob" });
  });

  it("titles the sent requests with a heading", () => {
    view(friends());
    expect(screen.getByRole("heading", { name: "Sent requests" })).toBeTruthy();
  });

  it("links each friend to their profile and shows no presence group", () => {
    view(friends());
    expect(screen.getByRole("link", { name: "View profile" }).getAttribute("href")).toBe(
      "/users/bob",
    );
    expect(screen.queryByText(/online|offline|in a game/i)).toBeNull();
  });

  it("says when there is nothing to show", () => {
    view(
      friends({
        friends: { status: "ready", items: [] },
        incoming: [],
        outgoing: [],
      }),
    );
    expect(screen.getByText("No pending requests")).toBeTruthy();
    expect(screen.getByText("No friends yet")).toBeTruthy();
    expect(screen.queryByText("Sent requests")).toBeNull();
  });

  it("offers Retry for the list that failed, leaving the other readable", async () => {
    const state = friends({ friends: { status: "error" } });
    view(state);
    expect(screen.getByText("Could not load your friends.")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(state.reloadFriends).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Accept carol" })).toBeTruthy();
  });

  it("shows loading for both lists", () => {
    view(friends({ friends: { status: "loading" }, requests: { status: "loading" } }));
    expect(screen.getAllByText("Loading…")).toHaveLength(2);
  });

  it("offers Retry for the requests list", async () => {
    const state = friends({ requests: { status: "error" } });
    view(state);
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(state.reloadRequests).toHaveBeenCalled();
  });
});
