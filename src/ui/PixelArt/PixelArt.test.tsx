import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ART } from "./art";
import { PixelArt } from "./PixelArt";
import { runs } from "./runs";

describe("runs", () => {
  it("merges neighbouring cells of one colour into one rectangle per row", () => {
    expect(runs(["aab.b"])).toEqual([
      { x: 0, y: 0, width: 2, colour: "a" },
      { x: 2, y: 0, width: 1, colour: "b" },
      { x: 4, y: 0, width: 1, colour: "b" },
    ]);
  });

  it("treats '.' and space as empty", () => {
    expect(runs([". .", "..."])).toEqual([]);
  });
});

describe("PixelArt", () => {
  it("is decorative unless it is given a title", () => {
    const { container } = render(<PixelArt grid={["a"]} />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).not.toHaveAttribute("role");
  });

  it("is an image with that name when titled", () => {
    render(<PixelArt grid={["a"]} title="A heart" />);
    expect(screen.getByRole("img", { name: "A heart" })).toBeInTheDocument();
  });

  it("sizes its viewBox to the widest row and the number of rows", () => {
    const { container } = render(<PixelArt grid={["aa", "aaaa", "a"]} />);
    expect(container.querySelector("svg")).toHaveAttribute("viewBox", "0 0 4 3");
  });

  it("paints from the --px-* palette tokens, never a literal", () => {
    const { container } = render(<PixelArt grid={["ab"]} />);
    expect([...container.querySelectorAll("rect")].map((r) => r.getAttribute("fill"))).toEqual([
      "var(--px-a)",
      "var(--px-b)",
    ]);
  });
});

describe("ART", () => {
  it("only uses cells the palette defines", () => {
    for (const [name, grid] of Object.entries(ART)) {
      for (const row of grid) expect(row, name).toMatch(/^[a-e. ]*$/);
    }
  });
});
