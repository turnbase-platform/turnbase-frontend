import { describe, expect, it } from "vitest";
import { outcomeVariant } from "./outcomeTone";

describe("outcomeVariant", () => {
  it.each([
    ["Victory", "success"],
    ["Won by forfeit", "success"],
    ["Defeat", "error"],
    ["Lost", "error"],
    ["Draw", "neutral"],
    ["2nd place", "neutral"],
  ])("tints %s as %s", (label, variant) => {
    expect(outcomeVariant(label)).toBe(variant);
  });
});
