import { describe, expect, it } from "vitest";
import { palette as p, type Pair } from "./palette";

// design-system.md §6: WCAG AA is a hard floor — 4.5:1 for text, 3:1 for large text and UI
// boundaries — in BOTH appearances. This computes it from the palette, so a colour edit that
// breaks contrast fails here rather than in an axe run weeks later.

type Rgb = readonly [number, number, number];

function parse(hex: string): { rgb: Rgb; a: number } {
  const h = hex.slice(1);
  const n = (i: number) => parseInt(h.slice(i, i + 2), 16);
  return { rgb: [n(0), n(2), n(4)], a: h.length === 8 ? n(6) / 255 : 1 };
}

/** The colour as seen over `base` (translucent surfaces sit on the page background). */
function over(hex: string, base: Rgb): Rgb {
  const { rgb, a } = parse(hex);
  return [0, 1, 2].map((i) => Math.round(rgb[i] * a + base[i] * (1 - a))) as unknown as Rgb;
}

function luminance([r, g, b]: Rgb): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function ratio(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const MODES = [
  ["light", 0],
  ["dark", 1],
] as const;

const pick = (pair: Pair, i: 0 | 1) => pair[i];

/** [foreground, background, minimum ratio, what it is] */
const PAIRS: readonly [Pair, Pair, number, string][] = [
  // Body text on every surface a paragraph can sit on.
  [p.ink, p.space, 4.5, "primary text on the page"],
  [p.ink, p.surface, 4.5, "primary text on a surface"],
  [p.ink, p.card, 4.5, "primary text on a card"],
  [p.ink, p.popover, 4.5, "primary text on a popover"],
  [p.ink, p.muted, 4.5, "primary text on a muted panel"],
  [p.inkSoft, p.space, 4.5, "secondary text on the page"],
  [p.inkSoft, p.surface, 4.5, "secondary text on a surface"],
  [p.inkSoft, p.card, 4.5, "secondary text on a card"],
  [p.inkSoft, p.muted, 4.5, "secondary text on a muted panel"],
  // Accent colours used AS TEXT take the -Text / deep variants.
  [p.cyanText, p.space, 4.5, "accent text on the page"],
  [p.cyanText, p.surface, 4.5, "accent text on a surface"],
  [p.cyanText, p.card, 4.5, "accent text on a card"],
  [p.amber, p.space, 4.5, "warning text on the page"],
  [p.amber, p.surface, 4.5, "warning text on a surface"],
  [p.green, p.space, 4.5, "success text on the page"],
  [p.green, p.surface, 4.5, "success text on a surface"],
  [p.red, p.space, 4.5, "error text on the page"],
  [p.red, p.surface, 4.5, "error text on a surface"],
  [p.magenta, p.space, 4.5, "magenta text on the page"],
  // Text on a filled control or badge.
  [p.onCyan, p.cyan, 4.5, "text on an accent fill"],
  [p.onGreen, p.green, 4.5, "text on a success fill"],
  [p.onRed, p.red, 4.5, "text on an error fill"],
  [p.onAmberFill, p.amberFill, 4.5, "text on a warning fill"],
  // UI boundaries and large display type.
  [p.cyan, p.space, 3, "accent edge or large type on the page"],
  [p.borderEmphasized, p.space, 3, "an emphasised control border on the page"],
  [p.borderEmphasized, p.surface, 3, "an emphasised control border on a surface"],
];

describe.each(MODES)("contrast in %s appearance", (_name, i) => {
  const space = parse(pick(p.space, i)).rgb;
  it.each(PAIRS)("%#: %s", (fg, bg, min, what) => {
    // Translucent backgrounds sit on the page; translucent foregrounds on their background.
    const bgRgb = over(pick(bg, i), space);
    const fgRgb = over(pick(fg, i), bgRgb);
    expect(ratio(fgRgb, bgRgb), what).toBeGreaterThanOrEqual(min);
  });
});

describe("the helpers", () => {
  it("scores black on white as 21:1 and a colour on itself as 1:1", () => {
    expect(ratio([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 5);
    expect(ratio([10, 20, 30], [10, 20, 30])).toBeCloseTo(1, 5);
  });
  it("composites alpha over a base", () => {
    expect(over("#FFFFFF80", [0, 0, 0])).toEqual([128, 128, 128]);
  });
});
