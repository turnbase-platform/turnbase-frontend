import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

// ADR-0017 §2.5: raw colours are allowed in exactly one place — the generated theme build, which
// the lint config ignores. Anything hand-written next to it, and every component, still fails.
const eslint = new ESLint();

async function ruleIds(code, filePath) {
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.map((m) => m.ruleId);
}

describe("raw-colour scope", () => {
  it("is enforced on a hand-written stylesheet beside the theme", async () => {
    expect(await ruleIds("a { color: #fff; }\n", "src/theme/extra.css")).toContain(
      "local/no-raw-color-css",
    );
  });

  it("is enforced on a component stylesheet", async () => {
    expect(await ruleIds("a { color: #fff; }\n", "src/ui/Thing.module.css")).toContain(
      "local/no-raw-color-css",
    );
  });

  it("is not applied to the generated theme build", async () => {
    const [result] = await eslint.lintText("a { color: #fff; }\n", {
      filePath: "src/theme/turnbase.css",
    });
    expect(result.messages.map((m) => m.message).join()).toMatch(/ignored/);
    expect(result.errorCount).toBe(0);
  });

  it("never exempts spacing, generated or not", async () => {
    expect(await ruleIds("a { padding: 10px; }\n", "src/theme/extra.css")).toContain(
      "local/no-raw-spacing-css",
    );
  });
});
