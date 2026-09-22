import { RuleTester } from "eslint";
import css from "@eslint/css";
import { describe } from "vitest";
import rule from "./no-raw-color-css.js";

const ruleTester = new RuleTester({
  plugins: { css },
  language: "css/css",
});

describe("no-raw-color-css", () => {
  ruleTester.run("no-raw-color-css", rule, {
    valid: [
      "a { color: var(--color-text-primary); }",
      "a { background: var(--color-background-surface); }",
      "a { border-color: currentColor; }",
      "a { color: red; }", // named CSS colors are out of this rule's stated scope
    ],
    invalid: [
      {
        code: "a { color: #fff; }",
        errors: [{ messageId: "rawColor" }],
      },
      {
        code: "a { color: #a1b2c3; }",
        errors: [{ messageId: "rawColor" }],
      },
      {
        code: "a { background: rgb(0 0 0 / 50%); }",
        errors: [{ messageId: "rawColor" }],
      },
      {
        code: "a { background: rgba(0, 0, 0, 0.5); }",
        errors: [{ messageId: "rawColor" }],
      },
      {
        code: "a { color: hsl(200deg 50% 50%); }",
        errors: [{ messageId: "rawColor" }],
      },
      {
        code: "a { color: oklch(0.7 0.15 200); }",
        errors: [{ messageId: "rawColor" }],
      },
      {
        // a raw literal nested inside another function is still raw
        code: "a { color: color-mix(in srgb, #fff, var(--color-text-primary)); }",
        errors: [{ messageId: "rawColor" }],
      },
    ],
  });
});
