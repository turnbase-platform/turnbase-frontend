import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { RoomSettings } from "./RoomSettings";
import type { RoomStateSnapshot } from "./rooms-types";

const snapshot = (extra: Partial<RoomStateSnapshot> = {}) =>
  ({
    spectatingEnabled: true,
    spectatorCapacity: 4,
    parameters: { boardSize: 3, first: "host" },
    ...extra,
  }) as RoomStateSnapshot;

describe("RoomSettings", () => {
  it("lists who can join, spectating and each game parameter, read-only", () => {
    render(<RoomSettings snapshot={snapshot()} visibility="FRIENDS_ONLY" />);
    const list = within(screen.getByLabelText("Room settings"));
    expect(list.getByText("Friends Only")).toBeInTheDocument();
    expect(list.getByText("Up to 4")).toBeInTheDocument();
    expect(list.getByText("boardSize")).toBeInTheDocument();
    expect(list.getByText("3")).toBeInTheDocument();
    expect(list.getByText("host")).toBeInTheDocument();
    expect(screen.queryByRole("switch")).toBeNull();
  });

  it("says so when spectators are off and the game has no parameters", () => {
    render(<RoomSettings snapshot={snapshot({ spectatingEnabled: false, parameters: {} })} />);
    expect(screen.getByText("Not allowed")).toBeInTheDocument();
    expect(screen.getByText("This game has no parameters.")).toBeInTheDocument();
    expect(screen.queryByText("Who can join")).toBeNull();
  });
});
