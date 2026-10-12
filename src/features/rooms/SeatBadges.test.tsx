import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SeatBadges } from "./SeatBadges";
import type { RoomPlayer } from "./rooms-types";

const player = (extra: Partial<RoomPlayer> = {}): RoomPlayer => ({
  playerId: "u-1",
  username: "alice",
  teamId: null,
  ready: false,
  connected: true,
  joinOrder: 1,
  ...extra,
});

describe("SeatBadges", () => {
  it("shows the host as host, not as ready", () => {
    render(<SeatBadges player={player({ ready: true })} isHost />);
    expect(screen.getByText("Host")).toBeInTheDocument();
    expect(screen.queryByText("Ready")).toBeNull();
  });

  it("shows readiness for a guest, and a dropped connection", () => {
    const { rerender } = render(<SeatBadges player={player()} isHost={false} />);
    expect(screen.getByText("Not ready")).toBeInTheDocument();
    rerender(<SeatBadges player={player({ ready: true, connected: false })} isHost={false} />);
    expect(screen.getByText("Ready")).toBeInTheDocument();
    expect(screen.getByText("Disconnected")).toBeInTheDocument();
  });

  it("leaves readiness out once the game has started", () => {
    render(<SeatBadges player={player()} isHost={false} showReady={false} />);
    expect(screen.queryByText("Not ready")).toBeNull();
  });
});
