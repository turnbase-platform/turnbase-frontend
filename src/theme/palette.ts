/**
 * The TurnBase palette: the single place a colour value is written (ADR-0017 §2).
 *
 * Every entry is `[light, dark]`. Dark is the near-black-indigo "deep space" with cyan, magenta
 * and amber accents; light is "starlight" — cool lavender-white with deeper accents of the same
 * hues. `contrast.test.ts` holds every text/background pair to WCAG AA in both.
 */
export type Pair = readonly [light: string, dark: string];

export const palette = {
  space: ["#ECEFFB", "#070817"],
  surface: ["#FFFFFF", "#171B42"],
  card: ["#FFFFFFAD", "#151A40A8"],
  popover: ["#FFFFFFF5", "#10143AF5"],
  muted: ["#E1E6F8", "#0E1233"],
  ink: ["#12163A", "#EDF1FF"],
  inkSoft: ["#4A527E", "#A3AED6"],
  inkFaint: ["#8D95BC", "#5A6490"],
  cyan: ["#00758F", "#2EE6F6"],
  cyanSoft: ["#D3F1F7", "#2EE6F61F"],
  cyanText: ["#00677F", "#5EF0FA"],
  onCyan: ["#FFFFFF", "#031219"],
  magenta: ["#B3127A", "#FF6FC6"],
  magentaFill: ["#B3127A", "#FF4DB8"],
  amber: ["#7A4A00", "#FFC247"],
  amberFill: ["#F2B01E", "#FFC247"],
  onAmberFill: ["#1A1000", "#1A1000"],
  amberSoft: ["#FBE6BC", "#FFC24726"],
  green: ["#00703F", "#62F5A8"],
  greenSoft: ["#CBF2DF", "#62F5A826"],
  onGreen: ["#FFFFFF", "#04140B"],
  red: ["#B3122E", "#FF7A8E"],
  redSoft: ["#FBD3DA", "#FF7A8E26"],
  onRed: ["#FFFFFF", "#1A0308"],
  dim: ["#8D95BC", "#4A5290"],
  iconSecondary: ["#5A628C", "#8E9AC6"],
  border: ["#12163A24", "#FFFFFF1F"],
  borderEmphasized: ["#6F79B3", "#6872C0"],
  overlay: ["#0B0E2A80", "#02030ACC"],
} as const satisfies Record<string, Pair>;

/** Translucent washes, glows and lines — used for fills and edges, never as text. */
export const effects = {
  "--tb-glow-a": ["rgb(0 117 143 / 20%)", "rgb(46 230 246 / 20%)"],
  "--tb-glow-b": ["rgb(179 18 122 / 14%)", "rgb(255 77 184 / 18%)"],
  "--tb-glow-c": ["rgb(255 194 71 / 22%)", "rgb(255 194 71 / 10%)"],
  "--tb-line": ["rgb(18 22 58 / 14%)", "rgb(255 255 255 / 12%)"],
  "--tb-sheen": ["rgb(255 255 255 / 70%)", "rgb(255 255 255 / 9%)"],
  "--tb-tile": ["rgb(255 255 255 / 60%)", "rgb(255 255 255 / 5%)"],
  "--tb-scanline": ["rgb(18 22 58 / 3%)", "rgb(255 255 255 / 3.5%)"],
  "--tb-spot": ["rgb(0 117 143 / 12%)", "rgb(46 230 246 / 13%)"],
  "--tb-star-a": ["#3A3F8F", "#FFFFFF"],
} as const satisfies Record<string, Pair>;

export const lightDark = ([light, dark]: Pair): string => `light-dark(${light}, ${dark})`;
