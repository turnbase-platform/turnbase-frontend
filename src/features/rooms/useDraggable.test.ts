import { describe, expect, it } from "vitest";
import { clampToViewport } from "./useDraggable";

const size = { width: 300, height: 200 };
const viewport = { width: 1000, height: 700 };

describe("clampToViewport", () => {
  it("leaves a point that fits alone", () => {
    expect(clampToViewport({ x: 100, y: 120 }, size, viewport)).toEqual({ x: 100, y: 120 });
  });

  it("holds the box inside every edge, a margin from it", () => {
    expect(clampToViewport({ x: -50, y: -50 }, size, viewport)).toEqual({ x: 8, y: 8 });
    expect(clampToViewport({ x: 5000, y: 5000 }, size, viewport)).toEqual({ x: 692, y: 492 });
  });

  it("pins a box larger than the viewport to the top-left margin", () => {
    expect(clampToViewport({ x: 40, y: 40 }, { width: 2000, height: 2000 }, viewport)).toEqual({
      x: 8,
      y: 8,
    });
  });
});
