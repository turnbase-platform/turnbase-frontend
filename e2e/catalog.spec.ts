import { expect, test } from "./fixtures";
import type { Page } from "@playwright/test";
import { createRoom, enterFromList, login, newPlayer, playAsGuest, TTT_TITLE } from "./support";

// IMP-M8-08: /games and /games/:id and the create-room choice (VW-CAT-001…003, VW-GDET-001…003,
// FR-CREATE-001/002, FR-LIST-006, RR-06, RR-07's /games). Unauth, Guest and seeded `alice`.

function watchConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (m) => {
    if ((m.type() === "error" || m.type() === "warning") && !/status of (4\d\d)/.test(m.text())) {
      errors.push(m.text());
    }
  });
  page.on("response", (r) => {
    if (r.status() >= 500) errors.push(`${String(r.status())} ${r.url()}`);
  });
  return errors;
}

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

test("Unauth: catalog and detail show no Create room; 400 px does not scroll the page", async ({
  browser,
}) => {
  const { page } = await newPlayer(browser, "unauth");
  const errors = watchConsole(page);
  await page.setViewportSize({ width: 400, height: 800 });
  await page.goto("/games");
  await expect(page.getByRole("link", { name: new RegExp(TTT_TITLE) }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Create room" })).toHaveCount(0); // VW-CAT-003
  await expectNoHorizontalScroll(page);

  await page.getByLabel("Search games", { exact: true }).fill("zzz-no-such-game"); // VW-CAT-001, empty state
  await expect(page.getByText("No games match your search")).toBeVisible();
  await page.getByLabel("Search games", { exact: true }).fill("tic");
  await page
    .getByRole("link", { name: new RegExp(TTT_TITLE) })
    .first()
    .click();
  await expect(page.getByRole("heading", { level: 1, name: TTT_TITLE })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Statistics" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create room" })).toHaveCount(0); // VW-GDET-003
  await expectNoHorizontalScroll(page);
  expect(errors).toEqual([]);
});

test("Guest: Friends Only is not offered; Invite Only is", async ({ browser }) => {
  const guest = await newPlayer(browser, "guest");
  await playAsGuest(guest);
  const { page } = guest;
  await page.goto("/games");
  await page.getByRole("button", { name: "Create room" }).first().click();
  await expect(page.getByRole("radio", { name: "Public" })).toBeChecked();
  await expect(page.getByRole("radio", { name: "Invite Only" })).toBeVisible();
  await expect(page.getByRole("radio", { name: "Friends Only" })).toHaveCount(0);
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("alice: the dialog posts the chosen visibility and spectating", async ({ browser }) => {
  const alice = await newPlayer(browser, "alice");
  const errors = watchConsole(alice.page);
  await login(alice, "alice");
  const { page } = alice;
  await page.goto("/games");
  await page
    .getByRole("link", { name: new RegExp(TTT_TITLE) })
    .first()
    .click();
  await page.getByRole("button", { name: "Create room" }).click();
  await expect(page.getByRole("radio", { name: "Friends Only" })).toBeVisible();
  await page.getByRole("radio", { name: "Friends Only" }).check();
  await expect(page.getByRole("switch", { name: "Allow spectators" })).toBeVisible();
  const posted = page.waitForRequest(
    (r) => r.url().endsWith("/api/rooms") && r.method() === "POST",
  );
  await page.getByRole("switch", { name: "Allow spectators" }).click();
  await page.getByRole("button", { name: "Create", exact: true }).click();
  expect((await posted).postDataJSON()).toMatchObject({
    visibility: "FRIENDS_ONLY",
    spectatingEnabled: true,
  });
  await expect(page).toHaveURL(/\/rooms\/[0-9a-f-]{36}$/);
  expect(errors).toEqual([]);
});

test("a public spectating room made through the dialog can be entered as a spectator", async ({
  browser,
}) => {
  const host = await newPlayer(browser, "host");
  await login(host, "alice");
  await createRoom(host, { spectating: true });
  const watcher = await newPlayer(browser, "watcher");
  await playAsGuest(watcher);
  await enterFromList(watcher, "alice", "Spectate");
  await expect(watcher.page.getByRole("list", { name: "Spectators" })).toBeVisible();
});
