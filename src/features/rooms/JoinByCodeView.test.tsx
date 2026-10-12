import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { RoomResource } from "./rooms-types";
import { authWrapper, fakeAuth } from "../../test/authWrapper";
import { JoinByCodeView } from "./JoinByCodeView";
import type { JoinState } from "./useJoinByCode";

const ROOM = {
  roomId: "r-1",
  gameId: "tictactoe",
  gameName: "Tic-Tac-Toe",
  hostUsername: "bob",
  playerCount: 1,
  playerCapacity: 2,
  canJoin: true,
  canSpectate: true,
} as RoomResource;

function view(state: JoinState, onEnter = vi.fn()) {
  render(<JoinByCodeView code="NOVA-7Q" state={state} onEnter={onEnter} />, {
    wrapper: authWrapper(fakeAuth()),
  });
  return onEnter;
}

describe("JoinByCodeView", () => {
  it.each(["resolving", "joining"] as const)("says Joining… while %s", (status) => {
    view({ status });
    expect(screen.getByRole("heading", { level: 1, name: "Join a room" })).toBeInTheDocument();
    expect(screen.getByText("Joining…")).toBeInTheDocument();
  });

  it("shows the code, names the room and offers both roles", async () => {
    const onEnter = view({ status: "choose", room: ROOM });
    expect(screen.getByText("NOVA-7Q")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Tic-Tac-Toe" })).toBeInTheDocument();
    expect(screen.getByText("Host bob · 1/2 players")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Join as player" }));
    expect(onEnter).toHaveBeenCalledWith("PLAYER");
    await userEvent.click(screen.getByRole("button", { name: "Join as spectator" }));
    expect(onEnter).toHaveBeenCalledWith("SPECTATOR");
  });

  it("shows why it failed and links to the active rooms", () => {
    view({ status: "failed", reason: "This invite link is not valid." });
    expect(
      screen.getByRole("heading", { level: 1, name: "We couldn’t find that room" }),
    ).toBeInTheDocument();
    expect(screen.getByText("This invite link is not valid.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse active rooms" })).toHaveAttribute(
      "href",
      "/rooms",
    );
  });
});
