import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { RoomEntryView } from "./RoomEntryView";
import type { RoomResource } from "./rooms-types";
import type { RoomEntry } from "./useRoomEntry";

const room = (over: Partial<RoomResource> = {}) =>
  ({
    gameName: "Tic-Tac-Toe",
    hostUsername: "bob",
    canJoin: true,
    canSpectate: true,
    ...over,
  }) as RoomResource;

function view(entry: RoomEntry["entry"], failure: string | null = null) {
  const enrol = vi.fn();
  render(
    <MemoryRouter>
      <RoomEntryView entry={{ entry, failure, enrol }} />
    </MemoryRouter>,
  );
  return enrol;
}

describe("RoomEntryView", () => {
  it("says the room is being entered while resolving", () => {
    view({ status: "resolving" });
    expect(screen.getByText("Entering room…")).toBeTruthy();
  });

  it("explains an unavailable room and links back to the list", () => {
    view({ status: "unavailable" });
    expect(screen.getByText(/closed, or has no role available to you/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Browse active rooms" }).getAttribute("href")).toBe(
      "/rooms",
    );
  });

  it("VW-JOIN-002: offers both roles and enrols with the one pressed", async () => {
    const enrol = view({ status: "prompt", room: room(), instanceHint: null });
    expect(screen.getByRole("heading", { level: 1, name: "Tic-Tac-Toe" })).toBeTruthy();
    expect(screen.getByText(/Host bob/)).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Join as spectator" }));
    await userEvent.click(screen.getByRole("button", { name: "Join as player" }));
    expect(enrol.mock.calls).toEqual([["SPECTATOR"], ["PLAYER"]]);
  });

  it("offers only the roles that are open, and shows a refusal", () => {
    view(
      { status: "prompt", room: room({ canJoin: false }), instanceHint: null },
      "The room is full.",
    );
    expect(screen.queryByRole("button", { name: "Join as player" })).toBeNull();
    expect(screen.getByRole("button", { name: "Join as spectator" })).toBeTruthy();
    expect(screen.getByText("The room is full.")).toBeTruthy();
  });
});
