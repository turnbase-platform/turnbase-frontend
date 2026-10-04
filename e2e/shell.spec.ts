import { expect, test } from "./fixtures";
import type { Page } from "@playwright/test";
import { login, newPlayer, playAsGuest } from "./support";

// IMP-M8-06: the shell — nav bar, user menu, landing page, 403/404 views and the redirect rows
// (VW-NAV-001…012, VW-LAND-001…004, VW-REDIR-001…007, NFR-SEC-001, NFR-USAB-001…002), as Unauth,
// Guest and a seeded Registered user. One login only (the address limit is RR-10).

const nav = (page: Page) => page.locator("header");

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
    if (m.type() === "error" || m.type() === "warning") errors.push(m.text());
  });
  await page.goto("/");
  await expect(nav(page).getByRole("link", { name: "TurnBase" })).toBeVisible();
  await expect(nav(page).getByRole("link", { name: "Games" })).toBeVisible();
  for (const name of ["Rooms", "Friends"]) {
    await expect(nav(page).getByRole("link", { name })).toHaveCount(0);
  }
  await expect(nav(page).getByRole("button", { name: "Notifications" })).toHaveCount(0);
  for (const name of ["Log in", "Register", "Play as Guest"]) {
    await expect(nav(page).getByText(name, { exact: true })).toBeVisible();
    await expect(page.getByRole("main").getByText(name, { exact: true })).toBeVisible();
  }
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

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

test("Guest: nav, 403 explanation and the narrow header", async ({ browser }) => {
  const player = await newPlayer(browser, "guest");
  const { page } = player;
  await playAsGuest(player);
  await expect(nav(page).getByRole("link", { name: "Rooms" })).toBeVisible();
  await expect(nav(page).getByRole("button", { name: "Notifications" })).toBeVisible();
  await expect(nav(page).getByRole("link", { name: "Friends" })).toHaveCount(0);
  for (const name of ["Log in", "Register", "Play as Guest"]) {
    await expect(nav(page).getByText(name, { exact: true })).toHaveCount(0);
  }
  // VW-REDIR-001
  await page.goto("/login");
  await expect(page).toHaveURL(/\/rooms$/);
  // VW-NAV-006/010/011/012
  await nav(page).locator("button[aria-haspopup='menu']").click();
  await expect(page.getByRole("menuitem", { name: "View my profile" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Account settings" })).toHaveCount(0);
  await expect(page.getByRole("menuitem", { name: "Log out" })).toBeVisible();
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
  await nav(page).locator("button[aria-haspopup='menu']").click();
  await expect(page.getByRole("menuitem", { name: "Account settings" })).toBeVisible();
  await page.getByRole("menuitem", { name: "Account settings" }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await page.setViewportSize({ width: 400, height: 800 });
  await page.goto("/friends");
  await expectHeaderFits(page, { pageScroll: false });
  await nav(page).locator("button[aria-haspopup='menu']").click();
  await page.getByRole("menuitem", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(nav(page).getByText("Log in", { exact: true })).toBeVisible();
});
