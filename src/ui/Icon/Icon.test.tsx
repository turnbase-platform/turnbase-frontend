import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import * as icons from "./icons";

const ALL = Object.entries(icons);

describe("icon set", () => {
  it("exports a reasonable number of icons", () => {
    expect(ALL.length).toBeGreaterThan(30);
  });

  it.each(ALL)("%s is a decorative 20px glyph by default", (_name, Icon) => {
    const { container } = render(<Icon />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("width", "20");
    expect(svg).toHaveAttribute("height", "20");
  });

  it("takes a size and passes SVG props through", () => {
    const { container } = render(<icons.IPlus size={32} className="x" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "32");
    expect(svg).toHaveClass("x");
  });

  it("draws in the colour of the surrounding text", () => {
    const { container } = render(<icons.IPlus />);
    expect(container.querySelector("svg")).toHaveAttribute("stroke", "currentColor");
  });
});
