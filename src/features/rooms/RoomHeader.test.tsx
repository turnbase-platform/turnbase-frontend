import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { RoomHeader } from "./RoomHeader";

describe("RoomHeader", () => {
  it("names the game, who can join and how many are watching", () => {
    render(<RoomHeader gameId="g-1" gameName="Tic-Tac-Toe" visibility="PUBLIC" watching={2} />);
    expect(screen.getByRole("heading", { level: 1, name: "Tic-Tac-Toe" })).toBeInTheDocument();
    expect(screen.getByText("Public")).toBeInTheDocument();
    expect(screen.getByText("2 watching")).toBeInTheDocument();
  });

  it("shows no chips when the room's visibility is unknown and nobody watches", () => {
    render(<RoomHeader gameId="g-1" gameName="Tic-Tac-Toe" watching={0} />);
    expect(screen.queryByText(/watching/)).toBeNull();
    expect(screen.queryByText("Public")).toBeNull();
  });
});
