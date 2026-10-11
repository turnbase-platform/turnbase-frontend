import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

// ADR-0017 §2.1: the built theme is committed, so the source and its output can disagree. This
// fails when someone edits turnbase.theme.ts or palette.ts and forgets `npm run theme:build`.
describe("committed theme build", () => {
  it("matches src/theme/turnbase.theme.ts", () => {
    const run = () =>
      execFileSync(
        process.execPath,
        [
          "node_modules/@astryxdesign/cli/clients/cli/bin/astryx.mjs",
          "theme",
          "build",
          "src/theme/turnbase.theme.ts",
          "--icons-specifier",
          "@astryxdesign/theme-neutral",
          "--check",
        ],
        { encoding: "utf8", stdio: "pipe" },
      );
    let output: string;
    try {
      output = run();
    } catch (cause) {
      const { stdout, stderr } = cause as { stdout: string; stderr: string };
      throw new Error(`theme outputs are stale — run \`npm run theme:build\`\n${stdout}${stderr}`, {
        cause,
      });
    }
    expect(output).toMatch(/up to date/);
  }, 30_000);
});
