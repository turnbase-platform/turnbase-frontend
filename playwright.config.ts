import { defineConfig } from "@playwright/test";

// IMP-M7-13: the acceptance tier. It drives the compose stack (`make up` in turnbase-platform)
// through real browser contexts — one per player. Serial on purpose: the specs share one
// platform, one room list and one seeded game, so parallel workers would see each other's rooms.
export default defineConfig({
  testDir: "e2e",
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: {
    baseURL: process.env.PLATFORM_URL ?? "http://turnbase.localhost:8080",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
