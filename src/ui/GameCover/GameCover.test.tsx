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

  it("takes a named piece and the flatter shape when told", () => {
    const { container } = render(<GameCover cover={{ piece: "dice", tone: "b" }} wide />);
    const cover = container.firstElementChild as HTMLElement;
    expect(cover).toHaveAttribute("data-wide", "true");
    expect(cover.style.getPropertyValue("--cover-glow")).toBe("var(--tb-glow-b)");
  });

  it("is the 4:3 hero tile only when tall", () => {
    const { container, rerender } = render(<GameCover gameId="a" />);
    expect(container.firstElementChild).not.toHaveAttribute("data-tall");
    rerender(<GameCover gameId="a" tall />);
    expect(container.firstElementChild).toHaveAttribute("data-tall", "true");
  });
});
