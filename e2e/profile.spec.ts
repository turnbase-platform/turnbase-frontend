import { expect, test, type Page } from "@playwright/test";
import { login, newPlayer, playAsGuest } from "./support";

// IMP-M8-11: /users/:username (VW-PROF-001…008, FR-STATS-020…027, FR-HIST-020…027) as Unauth,
// Guest and the seeded `alice` (friends with `bob`), `carol` (a stranger to `bob`) and `dave`,
// who turns his own profile private for the privacy rows and turns it public again.

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

async function setProfilePrivate(page: Page, profilePrivate: boolean) {
  const status = await page.evaluate(async (value) => {
    const response = await fetch("/api/users/me/privacy", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profilePrivate: value }),
    });
    return response.status;
  }, profilePrivate);
  expect(status).toBe(200);
}

/** Every public-profile section, with a retry-less, resolved state (View standard 3). */
async function expectPublicSections(page: Page) {
  await expect(page.getByRole("heading", { level: 2, name: "Statistics" })).toBeVisible();
  await expect(page.getByText("Total games played")).toBeVisible();
  await expect(page.getByText("Most played game")).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Game history" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Friends" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Uploaded games" })).toBeVisible();
  await expect(page.getByText("Loading…")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Retry" })).toHaveCount(0);
}

test("Unauth: a public profile, a missing one, at 400 px", async ({ browser }) => {
  const { page } = await newPlayer(browser, "unauth");
  const errors = watchConsole(page);
  await page.setViewportSize({ width: 400, height: 800 });

  await page.goto("/users/alice");
  await expect(page.getByRole("heading", { level: 1, name: "alice" })).toBeVisible();
  await expectPublicSections(page);
  // VW-PROF-006/007/008: nothing an Unauth visitor may not use is shown, not even disabled.
  await expect(page.getByRole("button", { name: "Add friend" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Remove friend" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Edit profile" })).toHaveCount(0);
  await expectNoHorizontalScroll(page);

  await page.goto("/users/no-such-user-here");
  await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("Guest: sees a public profile with no friend actions", async ({ browser }) => {
  const guest = await newPlayer(browser, "guest");
  const errors = watchConsole(guest.page);
  await playAsGuest(guest);

  await guest.page.goto("/users/bob");
  await expect(guest.page.getByRole("heading", { level: 1, name: "bob" })).toBeVisible();
  await expectPublicSections(guest.page);
  await expect(guest.page.getByRole("button", { name: /^(Add|Remove) friend$/ })).toHaveCount(0);
  await expect(guest.page.getByRole("link", { name: "Edit profile" })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("Registered: own profile, a friend's, a stranger's", async ({ browser }) => {
  const alice = await newPlayer(browser, "alice");
  const errors = watchConsole(alice.page);
  await login(alice, "alice");

  // VW-PROF-008: the owner gets Edit profile and no friend action.
  await alice.page.goto("/users/alice");
  await expectPublicSections(alice.page);
  await expect(alice.page.getByRole("link", { name: "Edit profile" })).toBeVisible();
  await expect(alice.page.getByRole("button", { name: /^(Add|Remove) friend$/ })).toHaveCount(0);
  await alice.page.getByRole("link", { name: "Edit profile" }).click();
  await expect(alice.page).toHaveURL(/\/settings$/);

  // VW-PROF-007: a friend's profile offers Remove, not Add.
  await alice.page.goto("/users/bob");
  await expect(alice.page.getByRole("button", { name: "Remove friend" })).toBeVisible();
  await expect(alice.page.getByRole("button", { name: "Add friend" })).toHaveCount(0);
  await expect(alice.page.getByRole("link", { name: "Edit profile" })).toHaveCount(0);

  // VW-PROF-006: a stranger's profile offers Add (not clicked — it would change the seed).
  const carol = await newPlayer(browser, "carol");
  await login(carol, "carol");
  await carol.page.goto("/users/bob");
  await expect(carol.page.getByRole("button", { name: "Add friend" })).toBeVisible();
  await expect(carol.page.getByRole("button", { name: "Remove friend" })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("a private profile is private to others and complete for its owner", async ({ browser }) => {
  const dave = await newPlayer(browser, "dave");
  await login(dave, "dave");
  await setProfilePrivate(dave.page, true);
  try {
    // VW-PROF-003: another registered user sees only the message.
    const carol = await newPlayer(browser, "carol");
    await login(carol, "carol");
    await carol.page.goto("/users/dave");
    await expect(carol.page.getByRole("heading", { level: 1, name: "dave" })).toBeVisible();
    await expect(carol.page.getByText("This profile is private.")).toBeVisible();
    await expect(carol.page.getByRole("heading", { level: 2 })).toHaveCount(0);

    const unauth = await newPlayer(browser, "unauth");
    await unauth.page.goto("/users/dave");
    await expect(unauth.page.getByText("This profile is private.")).toBeVisible();

    // The owner is exempt from their own setting (VW-PROF-002…002c, FR-PROF-007).
    await dave.page.goto("/users/dave");
    await expectPublicSections(dave.page);
    await expect(dave.page.getByText("This profile is private.")).toHaveCount(0);
    await expect(dave.page.getByRole("link", { name: "Edit profile" })).toBeVisible();
  } finally {
    await setProfilePrivate(dave.page, false);
  }
});

test("an error response renders a message with a retry, not an unresolved state", async ({
  browser,
}) => {
  const { page } = await newPlayer(browser, "unauth");
  let fail = true;
  await page.route("**/api/users/alice/statistics", (route) =>
    fail
      ? route.fulfill({ status: 500, contentType: "application/problem+json", body: "{}" })
      : route.continue(),
  );
  await page.goto("/users/alice");
  await expect(page.getByText("Could not load statistics.")).toBeVisible();
  fail = false;
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByText("Total games played")).toBeVisible();
  await expect(page.getByText("Could not load statistics.")).toHaveCount(0);
});
