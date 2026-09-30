import { RuleTester } from "eslint";
import tseslint from "typescript-eslint";
import { describe } from "vitest";
import rule from "./no-danger.js";

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tseslint.parser,
    sourceType: "module",
    ecmaVersion: "latest",
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

describe("no-danger", () => {
  ruleTester.run("no-danger", rule, {
    valid: [
      `const x = <div className="card">{text}</div>;`,
      `const html = "<b>not the banned name</b>";`,
      `const safe = { dangerous: true };`,
    ],
    invalid: [
      {
        code: `const x = <div dangerouslySetInnerHTML={{ __html: html }} />;`,
        errors: [{ messageId: "banned" }],
      },
      {
        code: `const x = createElement("div", { dangerouslySetInnerHTML: { __html: html } });`,
        errors: [{ messageId: "banned" }],
      },
      {
        code: `const x = createElement("div", { "dangerouslySetInnerHTML": { __html: html } });`,
        errors: [{ messageId: "banned" }],
      },
      {
        code: `props.dangerouslySetInnerHTML = { __html: html };`,
        errors: [{ messageId: "banned" }],
      },
    ],
  });
});
