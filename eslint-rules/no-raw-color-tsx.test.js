import { RuleTester } from "eslint";
import tseslint from "typescript-eslint";
import { describe } from "vitest";
import rule from "./no-raw-color-tsx.js";

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tseslint.parser,
    sourceType: "module",
    ecmaVersion: "latest",
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

describe("no-raw-color-tsx", () => {
  ruleTester.run("no-raw-color-tsx", rule, {
    valid: [
      `const x = <div className="card" />;`,
      `const style = { color: "var(--color-text-primary)" };`,
      `const label = "generally fine";`,
    ],
    invalid: [
      {
        code: `const style = { color: "#fff" };`,
        errors: [{ messageId: "rawColor" }],
      },
      {
        code: `const style = { color: "#ff00ff" };`,
        errors: [{ messageId: "rawColor" }],
      },
      {
        code: `const style = { background: "rgba(0, 0, 0, 0.5)" };`,
        errors: [{ messageId: "rawColor" }],
      },
      {
        code: "const style = `color: ${accent}; background: hsl(200deg 50% 50%);`;",
        errors: [{ messageId: "rawColor" }],
      },
    ],
  });
});
