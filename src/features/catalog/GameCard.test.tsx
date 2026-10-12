import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { CatalogGame } from "./catalog-types";
import { authWrapper, fakeAuth } from "../../test/authWrapper";
import { GameCard } from "./GameCard";

const GAME: CatalogGame = {
  gameId: "g-1",
  title: "Orbit Four",
  authorUsername: "rin_k",
  shortDescription: "Drop discs into the ring.",
  minPlayers: 2,
  maxPlayers: 6,
  supportsAi: false,
  supportsSpectators: true,
  version: "2.0.1",
  badge: "UNVERIFIED",
  createdAt: "2026-08-01T10:00:00Z",
  updatedAt: "2026-09-01T10:00:00Z",
};

const signedIn = authWrapper(
  fakeAuth({ userId: "u-1", username: "alice", kind: "REGISTERED" }),
  "/games",
);

describe("GameCard", () => {
  it("FR-CAT-002: a range of players, both flags, and no badge for an unverified game", () => {
    render(<GameCard game={GAME} />, { wrapper: signedIn });
    expect(screen.getByText("2–6")).toBeInTheDocument();
    expect(screen.getByText("No AI")).toBeInTheDocument();
    expect(screen.getByText("Spectators")).toBeInTheDocument();
    expect(screen.queryByText("Official")).toBeNull();
    expect(screen.queryByText("Verified")).toBeNull();
  });

  it("FR-CAT-009: the title links to the game, and Create room is a button beside it", () => {
    render(<GameCard game={GAME} />, { wrapper: signedIn });
    const link = screen.getByRole("link", { name: "Orbit Four" });
    expect(link).toHaveAttribute("href", "/games/g-1");
    expect(link).not.toContainElement(screen.getByRole("button", { name: "Create room" }));
  });

  it("FR-CAT-008: an unauthenticated visitor gets no Create room", () => {
    render(<GameCard game={GAME} />, { wrapper: authWrapper(fakeAuth(null), "/games") });
    expect(screen.queryByRole("button", { name: "Create room" })).toBeNull();
  });
});
