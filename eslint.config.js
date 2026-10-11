// @ts-check
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import eslintConfigPrettier from "eslint-config-prettier";
import css from "@eslint/css";
import noRawColorCss from "./eslint-rules/no-raw-color-css.js";
import noRawSpacingCss from "./eslint-rules/no-raw-spacing-css.js";
import noRawColorTsx from "./eslint-rules/no-raw-color-tsx.js";
import noDanger from "./eslint-rules/no-danger.js";

// design-system.md §5 Enforcement (FR-TOK-008): local rules, no third-party package defines
// them. No allow-list on either. Raw colours live in src/theme/palette.ts (a .ts file, outside the
// .tsx rule) and in the *generated* theme build, which is ignored below — a hand-written .css or
// .tsx that names a colour still fails (ADR-0017 §2.5).
const localTokenRules = {
  "no-raw-color-css": noRawColorCss,
  "no-raw-spacing-css": noRawSpacingCss,
  "no-raw-color-tsx": noRawColorTsx,
  "no-danger": noDanger,
};

// conventions.md §2: flat config, typescript-eslint strict + stylistic (type-aware),
// eslint-plugin-react-hooks, eslint-config-prettier last. Pinned here rather than left to
// whoever runs a scaffold tool first.
export default tseslint.config(
  {
    // `astryx theme build` output (ADR-0017 §2.1): regenerated, never edited, and full of colours.
    ignores: [
      "dist/**",
      "node_modules/**",
      "coverage/**",
      "src/theme/turnbase.{css,js,d.ts}",
      "src/theme/turnbase.variants.d.ts",
    ],
  },
  {
    // Scoped to TS/TSX explicitly — a css/css-language file matches no `files` glob here, so
    // none of these JS-oriented rulesets (several of which assume a JS-shaped sourceCode, e.g.
    // core's `no-irregular-whitespace`) ever run against it.
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
      reactHooks.configs.flat["recommended-latest"],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // design-system.md §4: `ui/` is entered through its public index, never a deep import,
      // and may not import from `features/` — a shared component that reaches into
      // application code is a screen with a generic name.
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/ui/*", "!**/ui", "!**/ui/index"],
              message: "Import from the ui/ entry point, not from inside it.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/ui/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/features/*", "@/features/*"],
              message: "ui/ may not import from features/.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { local: { rules: localTokenRules } },
    // `no-danger` (input-validation.md § Output encoding) applies to tests too; the colour rule
    // is .tsx-only, so it is switched on below rather than here.
    rules: { "local/no-danger": "error" },
  },
  {
    files: ["**/*.tsx"],
    rules: { "local/no-raw-color-tsx": "error" },
  },
  {
    files: ["**/*.css"],
    language: "css/css",
    plugins: { css, local: { rules: localTokenRules } },
    rules: {
      "local/no-raw-color-css": "error",
      "local/no-raw-spacing-css": "error",
    },
  },
  eslintConfigPrettier,
);
