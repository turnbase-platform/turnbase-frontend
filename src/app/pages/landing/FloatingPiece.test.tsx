import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { FloatingPiece } from "./FloatingPiece";

describe("FloatingPiece", () => {
  it("is one pixel piece placed and sized by custom properties", () => {
    const { container } = render(
      <FloatingPiece piece="dice" depth={1.2} size={52} delay={-2} position={{ left: "-6%" }} />,
    );
    const piece = container.firstElementChild as HTMLElement;
    expect(piece.querySelectorAll("svg")).toHaveLength(1);
    expect(piece.style.getPropertyValue("--s")).toBe("52px");
    expect(piece.style.getPropertyValue("--delay")).toBe("-2s");
    expect(piece.style.left).toBe("-6%");
  });
});
