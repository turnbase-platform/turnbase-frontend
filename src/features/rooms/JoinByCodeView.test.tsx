import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { RoomResource } from "./rooms-types";
import { authWrapper, fakeAuth } from "../../test/authWrapper";
import { JoinByCodeView } from "./JoinByCodeView";
import type { JoinState } from "./useJoinByCode";

const ROOM = { roomId: "r-1", gameName: "Tic-Tac-Toe", hostUsername: "bob" } as RoomResource;

function view(state: JoinState, onEnter = vi.fn()) {
  render(<JoinByCodeView state={state} onEnter={onEnter} />, { wrapper: authWrapper(fakeAuth()) });
  return onEnter;
}

describe("JoinByCodeView", () => {
  it.each(["resolving", "joining"] as const)("says Joining… while %s", (status) => {
    view({ status });
    expect(screen.getByRole("heading", { level: 1, name: "Join a room" })).toBeInTheDocument();
    expect(screen.getByText("Joining…")).toBeInTheDocument();
  });

  it("names the room and offers Player and Spectator", async () => {
    const onEnter = view({ status: "choose", room: ROOM });
    expect(screen.getByText("Join Tic-Tac-Toe, hosted by bob, as:")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Player" }));
    expect(onEnter).toHaveBeenCalledWith("PLAYER");
    await userEvent.click(screen.getByRole("button", { name: "Spectator" }));
    expect(onEnter).toHaveBeenCalledWith("SPECTATOR");
  });

  it("shows why it failed and links to the active rooms", () => {
    view({ status: "failed", reason: "This invite link is not valid." });
    expect(screen.getByText("This invite link is not valid.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse active rooms" })).toHaveAttribute(
      "href",
      "/rooms",
    );
  });
});
