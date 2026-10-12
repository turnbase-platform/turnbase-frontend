import { describe, expect, it } from "vitest";
import { PIECES } from "../PixelArt/pieces";
import { coverFor } from "./cover";

describe("coverFor", () => {
  it("gives the same game the same cover every time", () => {
    expect(coverFor("tictactoe")).toEqual(coverFor("tictactoe"));
  });

  it("varies across ids", () => {
    const covers = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"].map((id) =>
      JSON.stringify(coverFor(id)),
    );
    expect(new Set(covers).size).toBeGreaterThan(4);
  });

  it("always picks a piece that exists and one of three tones", () => {
    for (const id of ["", "x".repeat(500), "ünï-çødé", "tictactoe"]) {
      const { piece, tone } = coverFor(id);
      expect(Object.keys(PIECES)).toContain(piece);
      expect(["a", "b", "c"]).toContain(tone);
    }
  });
});
