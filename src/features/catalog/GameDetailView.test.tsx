import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { GameDetail } from "./catalog-types";
import { authWrapper, fakeAuth } from "../../test/authWrapper";
import { GameDetailView } from "./GameDetailView";

const GAME: GameDetail = {
  gameId: "g-1",
  title: "Chess",
  authorUsername: "TurnBase",
  shortDescription: "The classic game.",
  infoDocMarkdown: null,
  minPlayers: 2,
  maxPlayers: 2,
  supportsAi: true,
  supportsSpectators: false,
  tags: ["strategy"],
  credits: null,
  version: "1.0.0",
  badge: "VERIFIED",
  activePlayerCount: 4,
  completedSessionCount: 1284,
  createdAt: "2026-08-01T10:00:00Z",
  updatedAt: "2026-09-01T10:00:00Z",
};

const wrapper = (tier: "unauth" | "registered" = "unauth") =>
  authWrapper(
    fakeAuth(tier === "unauth" ? null : { userId: "u-1", username: "alice", kind: "REGISTERED" }),
    "/games/g-1",
  );

describe("GameDetailView", () => {
  it("FR-GDET-002/005: names the game, its badge, author, tags and live counts", () => {
    render(<GameDetailView state={{ status: "loaded", game: GAME }} />, { wrapper: wrapper() });
    expect(screen.getByRole("heading", { level: 1, name: "Chess" })).toBeInTheDocument();
    expect(screen.getByText("Verified")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "TurnBase" })).toHaveAttribute(
      "href",
      "/users/TurnBase",
    );
    expect(screen.getByRole("link", { name: /All games/ })).toHaveAttribute("href", "/games");
    expect(screen.getByText("strategy")).toBeInTheDocument();
    expect(screen.getByText("Players: 2")).toBeInTheDocument();
    expect(screen.getByText("AI players: supported")).toBeInTheDocument();
    expect(screen.getByText("Spectators: not supported")).toBeInTheDocument();
    expect(screen.getByText("Players in active rooms now: 4")).toBeInTheDocument();
    expect(screen.getByText("Completed sessions: 1284")).toBeInTheDocument();
    for (const name of ["About", "Details", "Statistics"])
      expect(screen.getByRole("heading", { level: 2, name })).toBeInTheDocument();
  });

  it("FR-GDET-003: no info document means the short description", () => {
    render(<GameDetailView state={{ status: "loaded", game: GAME }} />, { wrapper: wrapper() });
    expect(
      within(screen.getByRole("region", { name: "About" })).getByText("The classic game."),
    ).toBeInTheDocument();
  });

  it("VW-GDET-003: Create room is for signed-in players only", () => {
    const { unmount } = render(<GameDetailView state={{ status: "loaded", game: GAME }} />, {
      wrapper: wrapper(),
    });
    expect(screen.queryByRole("button", { name: "Create room" })).toBeNull();
    unmount();
    render(<GameDetailView state={{ status: "loaded", game: GAME }} />, {
      wrapper: wrapper("registered"),
    });
    expect(screen.getByRole("button", { name: "Create room" })).toBeInTheDocument();
  });

  it("VW-GDET-004: credits show only when the game declares them", () => {
    const { unmount } = render(<GameDetailView state={{ status: "loaded", game: GAME }} />, {
      wrapper: wrapper(),
    });
    expect(screen.queryByRole("region", { name: "Credits" })).not.toBeInTheDocument();
    unmount();
    const game: GameDetail = {
      ...GAME,
      credits: {
        designers: ["Antoine Bauza", "Bruno Cathala"],
        artists: ["Miguel Coimbra"],
        publisher: "Repos Production",
        year: 2015,
      },
    };
    render(<GameDetailView state={{ status: "loaded", game }} />, { wrapper: wrapper() });
    const region = screen.getByRole("region", { name: "Credits" });
    expect(
      within(region).getByText("Designed by Antoine Bauza, Bruno Cathala"),
    ).toBeInTheDocument();
    expect(within(region).getByText("Art by Miguel Coimbra")).toBeInTheDocument();
    expect(within(region).getByText("Published by Repos Production, 2015")).toBeInTheDocument();
  });

  it("shows a player range", () => {
    render(
      <GameDetailView
        state={{ status: "loaded", game: { ...GAME, minPlayers: 2, maxPlayers: 6 } }}
      />,
      { wrapper: wrapper() },
    );
    expect(screen.getByText("Players: 2–6")).toBeInTheDocument();
  });

  it("loading, gone and error each say what happened", () => {
    const { rerender } = render(<GameDetailView state={{ status: "loading" }} />, {
      wrapper: wrapper(),
    });
    expect(screen.getByText("Loading…")).toBeInTheDocument();

    rerender(<GameDetailView state={{ status: "gone" }} />);
    expect(screen.getByText("This game no longer exists.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to the catalog" })).toHaveAttribute(
      "href",
      "/games",
    );

    rerender(<GameDetailView state={{ status: "error" }} />);
    expect(screen.getByText("Could not load this game. Please try again.")).toBeInTheDocument();
  });

  it("FR-GDET-008: not-found is the ordinary not-found page", () => {
    render(<GameDetailView state={{ status: "not-found" }} />, { wrapper: wrapper() });
    expect(screen.getByText("Page not found")).toBeInTheDocument();
  });
});
