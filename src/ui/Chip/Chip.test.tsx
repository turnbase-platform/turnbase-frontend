import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Chip } from "./Chip";

describe("Chip", () => {
  it("carries its text and tone", () => {
    render(<Chip tone="turn">Your turn</Chip>);
    expect(screen.getByText("Your turn")).toHaveAttribute("data-tone", "turn");
  });

  it("is neutral by default and shows an icon before the text", () => {
    render(<Chip icon={<i data-testid="icon" />}>2–4 players</Chip>);
    const chip = screen.getByText("2–4 players");
    expect(chip).toHaveAttribute("data-tone", "neutral");
    expect(chip.firstElementChild).toBe(screen.getByTestId("icon"));
  });
});
