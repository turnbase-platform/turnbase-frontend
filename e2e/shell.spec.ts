import { expect, test } from "./fixtures";
import type { Page } from "@playwright/test";
import { login, newPlayer, playAsGuest } from "./support";

// IMP-M8-06: the shell — nav bar, user menu, landing page, 403/404 views and the redirect rows
// (VW-NAV-001…012, VW-LAND-001…004, VW-REDIR-001…007, NFR-SEC-001, NFR-USAB-001…002), as Unauth,
// Guest and a seeded Registered user. One login only (the address limit is RR-10).

const nav = (page: Page) => page.getByRole("navigation", { name: "Main" });
const accountMenu = (page: Page) => nav(page).getByRole("button", { name: / menu$/ });

/** No horizontal page scroll, and none of the nav's visible controls overlapping another. */
async function expectHeaderFits(page: Page, { pageScroll = true } = {}) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  if (pageScroll) expect(overflow).toBeLessThanOrEqual(0);
  const boxes = await nav(page)
    .locator("a:visible, button:visible")
    .evaluateAll((els) =>
      els.map((el) => {
        const r = el.getBoundingClientRect();
        return { name: el.getAttribute("aria-label") ?? el.textContent, r };
      }),
    );
  for (const [i, a] of boxes.entries()) {
    for (const b of boxes.slice(i + 1)) {
      const overlap =
        a.r.left < b.r.right - 1 &&
        b.r.left < a.r.right - 1 &&
        a.r.top < b.r.bottom - 1 &&
        b.r.top < a.r.bottom - 1;
      expect(overlap, `"${a.name}" overlaps "${b.name}"`).toBe(false);
    }
  }
}

test("Unauth: nav, landing and redirects", async ({ browser }) => {
  const { page } = await newPlayer(browser, "unauth");
  const errors: string[] = [];
  page.on("console", (m) => {
    // The 404 view below is a deliberate 404 (IMP-M10-17); a browser logs that as a console error.
    if ((m.type() === "error" || m.type() === "warning") && !/status of 4\d\d/.test(m.text()))
      errors.push(m.text());
  });
  await page.goto("/");
  await expect(nav(page).getByRole("link", { name: "TurnBase" })).toBeVisible();
  // The landing leads with its own "Browse all games"; the bar does not repeat it there.
  await expect(nav(page).getByRole("link", { name: "Games" })).toHaveCount(0);
  for (const name of ["Rooms", "Friends"]) {
    await expect(nav(page).getByRole("link", { name })).toHaveCount(0);
  }
  await expect(nav(page).getByRole("button", { name: "Notifications" })).toHaveCount(0);
  for (const name of ["Log in", "Create account", "Play as Guest"]) {
    await expect(nav(page).getByText(name, { exact: true })).toBeVisible();
  }
  for (const name of ["Log in", "Create account", "Play as Guest"]) {
    await expect(page.getByRole("main").getByText(name, { exact: true }).first()).toBeVisible();
  }
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  // The landing's five screens and the rail that jumps between them.
  await expect(page.getByRole("navigation", { name: "Landing sections" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2 })).toHaveCount(4);

  // VW-REDIR-002 and NFR-SEC-001
  await page.goto("/friends");
  await expect(page).toHaveURL(/\/login\?redirect=%2Ffriends$/);
  await page.goto("/login?redirect=//evil.example");
  expect(new URL(page.url()).origin).not.toContain("evil");

  // 404 view
  await page.goto("/no-such-page");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();

  await page.setViewportSize({ width: 400, height: 800 });
  await page.goto("/");
  await expectHeaderFits(page);
  expect(errors).toEqual([]);
});

// IMP-M10-24 (AUD-24): the tripwire forgives a browser's "status of 4xx" console line, which is exactly
// where an anonymous visitor's 401 would hide. This spec forgives none: an anonymous first load must
// leave the console empty and the session probe must have answered 200.
test("Unauth: an anonymous first load logs no console error and no 4xx", async ({ browser }) => {
  const { page } = await newPlayer(browser, "anon-console");
  const logged: string[] = [];
  const refused: string[] = [];
  const probes: number[] = [];
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") logged.push(m.text());
  });
  page.on("response", (r) => {
    if (r.status() >= 400) refused.push(`${String(r.status())} ${r.url()}`);
    if (new URL(r.url()).pathname === "/api/auth/session") probes.push(r.status());
  });
  for (const path of ["/", "/games", "/login"]) {
    await page.goto(path);
    await expect(nav(page).getByRole("link", { name: "TurnBase" })).toBeVisible();
    await expect(nav(page).getByText("Log in", { exact: true })).toBeVisible();
  }
  expect(probes).toEqual([200, 200, 200]);
  expect(refused).toEqual([]);
  expect(logged).toEqual([]);
});

test("Guest: nav, 403 explanation and the narrow header", async ({ browser }) => {
  const player = await newPlayer(browser, "guest");
  const { page } = player;
  await playAsGuest(player);
  await expect(nav(page).getByRole("link", { name: "Rooms" })).toBeVisible();
  await expect(nav(page).getByRole("button", { name: "Notifications" })).toBeVisible();
  await expect(nav(page).getByRole("link", { name: "Friends" })).toHaveCount(0);
  for (const name of ["Log in", "Create account", "Play as Guest"]) {
    await expect(nav(page).getByText(name, { exact: true })).toHaveCount(0);
  }
  // VW-REDIR-001
  await page.goto("/login");
  await expect(page).toHaveURL(/\/rooms$/);
  // VW-NAV-006/010/011/012
  await accountMenu(page).click();
  await expect(page.getByRole("menuitem", { name: "Profile" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Settings" })).toHaveCount(0);
  await expect(page.getByRole("menuitem", { name: "Leave as guest" })).toBeVisible();
  await page.keyboard.press("Escape");
  // VW-REDIR-003 / NFR-USAB-002
  for (const path of ["/friends", "/settings"]) {
    await page.goto(path);
    await expect(page.getByText("This feature requires a registered account.")).toBeVisible();
  }
  await page.setViewportSize({ width: 400, height: 800 });
  // Page scroll is checked on the shell's own pages; the rooms table is IMP-M8-09's.
  await page.goto("/rooms");
  await expect(nav(page).getByRole("button", { name: "Notifications" })).toBeVisible();
  await expectHeaderFits(page, { pageScroll: false });
  await page.goto("/friends");
  await expect(page.getByText("This feature requires a registered account.")).toBeVisible();
  await expectHeaderFits(page);
});

test("Registered: nav, user menu, redirect and logout", async ({ browser }) => {
  const player = await newPlayer(browser, "alice");
  const { page } = player;
  await login(player, "alice");
  await expect(nav(page).getByRole("link", { name: "Friends" })).toBeVisible();
  await accountMenu(page).click();
  await expect(page.getByRole("menuitem", { name: "Settings" })).toBeVisible();
  await page.getByRole("menuitem", { name: "Settings" }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await page.setViewportSize({ width: 400, height: 800 });
  await page.goto("/friends");
  await expectHeaderFits(page, { pageScroll: false });
  await accountMenu(page).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/$/);
  // At 400 px the bar keeps only the primary call to action.
  await expect(nav(page).getByText("Create account", { exact: true })).toBeVisible();
});

// IMP-M10-17 (VW-404-001): the edge answers an unknown path with 404 — the shell still loads, so the
// 404 view renders — while every shell route keeps 200.
test("an unknown path is a 404 that still renders the 404 view", async ({ page }) => {
  for (const path of ["/nope", "/games/x/y", "/assets/missing.js", "/auth/other"]) {
    const res = await page.request.get(path);
    expect(res.status(), path).toBe(404);
  }
  const res = await page.goto("/nope");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  expect(res?.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");

  for (const path of [
    "/",
    "/login",
    "/register",
    "/games",
    "/games/abc",
    "/users/bob",
    "/rooms",
    "/rooms/join/ABCD",
    "/rooms/xyz",
    "/friends",
    "/settings",
    "/auth/complete-registration",
  ]) {
    expect((await page.request.get(path)).status(), path).toBe(200);
  }
});
