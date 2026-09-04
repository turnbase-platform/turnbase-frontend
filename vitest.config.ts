import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// conventions.md §3: unit tests only here — there is no integration or e2e tier in this
// repository (FR-CICD-005 puts end-to-end coverage on HTTP/WebSocket clients, not a browser).
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      // Vitest 5 removed `coverage.all`: specifying `include` now collects coverage for every
      // matched file, tested or not, which is the same "no silent gap" behaviour `all: true`
      // used to name explicitly.
      include: ["src/**/*.{ts,tsx}"],
      // Entry point and ambient-declaration files: bootstrap code with no branches worth a
      // test, and the compiler-only vite-env.d.ts.
      exclude: ["src/main.tsx", "src/vite-env.d.ts", "src/test/**"],
      thresholds: {
        lines: 70,
        statements: 70,
        functions: 70,
        branches: 70,
      },
    },
  },
});
