import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { Glass } from "./Glass";

describe("Glass", () => {
  it("is a glass surface that does not tilt by default", () => {
    const { container } = render(<Glass className="mine">x</Glass>);
    const el = container.firstElementChild;
    expect(el?.className).toBe("tb-glass mine");
    expect(el?.hasAttribute("data-tilt")).toBe(false);
  });

  it("opts into the pointer tilt with the given angle", () => {
    const { container } = render(<Glass tilt={7}>x</Glass>);
    expect(container.firstElementChild?.getAttribute("data-tilt")).toBe("7");
  });
});
