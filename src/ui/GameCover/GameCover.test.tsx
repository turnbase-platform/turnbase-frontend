import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { GameCover } from "./GameCover";

describe("GameCover", () => {
  it("is decorative and draws one pixel-art svg", () => {
    const { container } = render(<GameCover gameId="tictactoe" />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelectorAll("svg")).toHaveLength(1);
  });

  it("opts into the pointer tilt only when asked", () => {
    const { container, rerender } = render(<GameCover gameId="a" />);
    expect(container.firstElementChild).not.toHaveAttribute("data-tilt");
    rerender(<GameCover gameId="a" tilt />);
    expect(container.firstElementChild).toHaveAttribute("data-tilt", "5");
  });
});
