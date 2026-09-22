import { RuleTester } from "eslint";
import css from "@eslint/css";
import { describe } from "vitest";
import rule from "./no-raw-spacing-css.js";

const ruleTester = new RuleTester({
  plugins: { css },
  language: "css/css",
});

describe("no-raw-spacing-css", () => {
  ruleTester.run("no-raw-spacing-css", rule, {
    valid: [
      "a { padding: var(--spacing-4); }",
      "a { margin: var(--spacing-2) var(--spacing-4); }",
      "a { gap: var(--spacing-2); }",
      "a { inset: var(--spacing-0); }",
      "a { color: red; padding: var(--spacing-1); }",
      // px/rem are fine on properties this rule does not govern
      "a { font-size: 1rem; border-width: 1px; width: 10rem; }",
      "a { padding: 50%; }",
    ],
    invalid: [
      { code: "a { padding: 4px; }", errors: [{ messageId: "rawSpacing" }] },
      { code: "a { padding: 1rem 2rem; }", errors: 2 },
      { code: "a { margin-top: 8px; }", errors: [{ messageId: "rawSpacing" }] },
      { code: "a { padding-inline-start: 8px; }", errors: [{ messageId: "rawSpacing" }] },
      { code: "a { gap: 8px; }", errors: [{ messageId: "rawSpacing" }] },
      { code: "a { row-gap: 8px; }", errors: [{ messageId: "rawSpacing" }] },
      { code: "a { inset-block: 4px; }", errors: [{ messageId: "rawSpacing" }] },
      {
        code: "a { padding: calc(var(--spacing-2) - 1px); }",
        errors: [{ messageId: "rawSpacing" }],
      },
      { code: "a { -webkit-margin-start: 4px; }", errors: [{ messageId: "rawSpacing" }] },
    ],
  });
});
