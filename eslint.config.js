// @ts-check
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import eslintConfigPrettier from "eslint-config-prettier";

// conventions.md §2: flat config, typescript-eslint strict + stylistic (type-aware),
// eslint-plugin-react-hooks, eslint-config-prettier last. Pinned here rather than left to
// whoever runs a scaffold tool first.
export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**", "coverage/**"] },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  reactHooks.configs.flat["recommended-latest"],
  reactRefresh.configs.vite,
  {
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
  eslintConfigPrettier,
);
