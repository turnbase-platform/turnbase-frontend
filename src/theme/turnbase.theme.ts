/**
 * The TurnBase theme (ADR-0017). `npm run theme:build` compiles this to `turnbase.css` /
 * `turnbase.js` / `turnbase.d.ts`, which are committed: the shell CSP is `style-src 'self'`, so a
 * theme injected at runtime would be blocked (design-system.md §2).
 *
 * Direction: deep-space arcade. Surfaces are fake glass — tint, sheen, a cursor spotlight and a lit
 * edge — and never `backdrop-filter`. Pixelify Sans is for display moments only.
 */
import { defineTheme } from "@astryxdesign/core/theme";
import { neutralIconRegistry, neutralTheme } from "@astryxdesign/theme-neutral";
import { effects, lightDark as ld, palette as p } from "./palette";

const PIXEL = "'Pixelify Sans', 'Figtree', ui-monospace, monospace";
const BODY_FALLBACKS =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
const EASE = "cubic-bezier(0.2, 0.8, 0.2, 1)";
const glow = (blur: number) => `0 0 ${String(blur)}px -2px var(--tb-cyan)`;

/** `--tb-*`: brand colours Astryx has no family for, plus the effect washes (ADR-0017 §2). */
const brand: Record<string, string> = {
  "--tb-pixel": PIXEL,
  "--tb-ease": EASE,
  "--tb-cyan": ld(p.cyan),
  "--tb-cyan-text": ld(p.cyanText),
  "--tb-magenta": ld(p.magenta),
  "--tb-magenta-fill": ld(p.magentaFill),
  "--tb-amber": ld(p.amber),
  "--tb-amber-fill": ld(p.amberFill),
  "--tb-green": ld(p.green),
  "--tb-ink": ld(p.ink),
  "--tb-star-b": ld(p.cyan),
  "--tb-star-c": ld(p.magenta),
  "--px-a": ld(p.cyan),
  "--px-b": ld(p.magentaFill),
  "--px-c": ld(p.amberFill),
  "--px-d": ld(p.ink),
  "--px-e": ld(p.dim),
  ...Object.fromEntries(Object.entries(effects).map(([k, v]) => [k, ld(v)])),
};

export const turnbaseTheme = defineTheme({
  name: "turnbase",
  extends: neutralTheme,
  // The built module re-exports the registry so components keep their icons (see theme:build).
  icons: neutralIconRegistry,

  typography: {
    scale: { base: 15, ratio: 1.2 },
    body: { family: "Figtree", fallbacks: BODY_FALLBACKS },
    heading: {
      family: "Figtree",
      fallbacks: BODY_FALLBACKS,
      weights: { 1: "bold", 2: "bold", 3: "bold", 4: "bold" },
    },
    code: {
      family: "ui-monospace",
      fallbacks: '"SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    },
  },

  tokens: {
    ...brand,

    "--color-background-body": ld(p.space),
    "--color-background-surface": ld(p.surface),
    "--color-background-card": ld(p.card),
    "--color-background-popover": ld(p.popover),
    "--color-background-muted": ld(p.muted),

    "--color-accent": ld(p.cyan),
    "--color-accent-muted": ld(p.cyanSoft),
    "--color-on-accent": ld(p.onCyan),
    "--color-text-accent": ld(p.cyanText),
    "--color-icon-accent": ld(p.cyanText),

    "--color-text-primary": ld(p.ink),
    "--color-text-secondary": ld(p.inkSoft),
    "--color-text-disabled": ld(p.inkFaint),
    "--color-icon-primary": ld(p.ink),
    "--color-icon-secondary": ld(p.iconSecondary),

    "--color-border": ld(p.border),
    "--color-border-emphasized": ld(p.borderEmphasized),
    "--color-overlay": ld(p.overlay),

    "--color-success": ld(p.green),
    "--color-success-muted": ld(p.greenSoft),
    "--color-on-success": ld(p.onGreen),
    "--color-error": ld(p.red),
    "--color-error-muted": ld(p.redSoft),
    "--color-on-error": ld(p.onRed),
    "--color-warning": ld(p.amber),
    "--color-warning-muted": ld(p.amberSoft),

    "--radius-inner": "8px",
    "--radius-element": "12px",
    "--radius-container": "18px",
    "--radius-page": "28px",

    "--shadow-low":
      "0 6px 18px light-dark(rgb(30 40 110 / 10%), rgb(0 0 0 / 35%)), " +
      "inset 0 1px 0 light-dark(rgb(255 255 255 / 85%), rgb(255 255 255 / 16%)), " +
      "inset 0 0 0 1px light-dark(rgb(255 255 255 / 45%), rgb(255 255 255 / 6%))",
    "--shadow-med":
      "0 10px 30px light-dark(rgb(30 40 110 / 14%), rgb(0 0 0 / 45%)), " +
      "inset 0 1px 0 light-dark(rgb(255 255 255 / 90%), rgb(255 255 255 / 20%)), " +
      "inset 0 0 0 1px light-dark(rgb(255 255 255 / 50%), rgb(255 255 255 / 8%))",
    "--shadow-high":
      "0 18px 48px light-dark(rgb(30 40 110 / 20%), rgb(0 0 0 / 60%)), " +
      "inset 0 1px 0 light-dark(rgb(255 255 255 / 95%), rgb(255 255 255 / 24%)), " +
      "inset 0 0 0 1px light-dark(rgb(255 255 255 / 55%), rgb(255 255 255 / 10%))",
    "--shadow-inset-hover": "inset 0 0 0 2px light-dark(#00758F66, #2EE6F666)",
    "--shadow-inset-selected": "inset 0 0 0 2px var(--color-accent)",
  },

  components: {
    // The pixel face is for display moments only; every other heading stays Figtree.
    heading: {
      "type:display-1": { fontFamily: PIXEL, letterSpacing: "0.01em" },
      "type:display-2": { fontFamily: PIXEL, letterSpacing: "0.01em" },
      "type:display-3": { fontFamily: PIXEL },
    },
    text: {
      "type:display-1": { fontFamily: PIXEL },
      "type:display-2": { fontFamily: PIXEL },
      "type:display-3": { fontFamily: PIXEL },
    },

    // Buttons: roomy, always bordered, and every variant answers hover and press.
    button: {
      base: {
        fontWeight: "600",
        transition: `transform 0.18s ${EASE}, box-shadow 0.22s, background-color 0.2s, border-color 0.2s, filter 0.2s`,
        ":active": { transform: "translateY(1px) scale(0.97)", filter: "brightness(0.95)" },
      },
      "size:sm": { minHeight: "36px", paddingInline: "16px", fontSize: "13px" },
      "size:md": { minHeight: "44px", paddingInline: "22px", fontSize: "15px" },
      "size:lg": { minHeight: "54px", paddingInline: "30px", fontSize: "17px" },
      "variant:primary": {
        border: "1px solid color-mix(in srgb, var(--color-accent), white 38%)",
        boxShadow: "0 6px 22px -6px var(--tb-glow-a)",
        ":hover": {
          boxShadow: `${glow(24)}, 0 6px 22px -6px var(--tb-glow-a)`,
          transform: "translateY(-2px)",
          filter: "brightness(1.08)",
        },
      },
      "variant:secondary": {
        border: "1px solid var(--color-border-emphasized)",
        backgroundColor: "var(--color-background-card)",
        ":hover": {
          borderColor: "var(--color-accent)",
          backgroundColor: "var(--color-accent-muted)",
          transform: "translateY(-1px)",
        },
      },
      "variant:ghost": {
        border: "1px solid transparent",
        ":hover": { backgroundColor: "var(--color-accent-muted)", transform: "translateY(-1px)" },
      },
      "variant:destructive": {
        border: "1px solid color-mix(in srgb, var(--color-error), white 30%)",
        ":hover": {
          transform: "translateY(-1px)",
          filter: "brightness(1.08)",
          boxShadow: "0 0 20px -4px var(--color-error)",
        },
      },
    },

    badge: {
      "variant:info": { backgroundColor: ld(p.cyan), color: ld(p.onCyan) },
      "variant:warning": { backgroundColor: ld(p.amberFill), color: ld(p.onAmberFill) },
      "variant:success": { backgroundColor: ld(p.green), color: ld(p.onGreen) },
    },
    statusdot: {
      "variant:success": { backgroundColor: ld(p.green) },
      "variant:warning": { backgroundColor: ld(p.amberFill) },
      "variant:accent": { backgroundColor: ld(p.cyan) },
    },
    progressbar: {
      "variant:accent": { "--color-accent": ld(p.cyan) },
      "variant:success": { "--color-success": ld(p.green) },
      "variant:warning": { "--color-warning": ld(p.amberFill) },
    },
  },
});
