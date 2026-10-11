import { expect, test } from "./fixtures";
import type { Page } from "@playwright/test";
import { newPlayer, playAsGuest, register, uniqueName } from "./support";

// IMP-M8-13: /settings (VW-SET-001…007) as Unauth, Guest and one freshly registered user (the single
// registration this spec spends). The account is deleted at the end, so the spec leaves nothing behind.

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

test("Unauth is sent to log in and back", async ({ browser }) => {
  const { page, context } = await newPlayer(browser, "unauth");
  await page.goto("/settings");
  await expect(page).toHaveURL(/\/login\?redirect=%2Fsettings$/);
  await context.close();
});

test("Guest sees the registered-only message and no forms", async ({ browser }) => {
  const guest = await newPlayer(browser, "guest");
  await playAsGuest(guest);
  await guest.page.goto("/settings");
  await expect(guest.page.getByText("This feature requires a registered account.")).toBeVisible();
  await expect(guest.page.getByRole("button", { name: /^Save/ })).toHaveCount(0);
  await expect(guest.page.getByRole("button", { name: "Delete my account" })).toHaveCount(0);
  await guest.context.close();
});

test("Registered: every form loads, saves and confirms; delete ends the account", async ({
  browser,
}) => {
  const me = await newPlayer(browser, "me");
  const errors = watchConsole(me.page);
  const username = await register(me);
  const { page } = me;
  await page.setViewportSize({ width: 400, height: 800 });
  await page.goto("/settings");

  await expect(page.getByRole("heading", { level: 1, name: "Account settings" })).toBeVisible();
  await expect(page.getByLabel(/^Username/)).toHaveValue(username);
  await expect(page.getByLabel(/^Email/)).toHaveValue(`${username}@example.test`);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);

  // VW-SET-001: the server's field error shows on the field; a valid name saves and is confirmed.
  await page.getByLabel(/^Username/).fill("x");
  await page.getByRole("button", { name: "Save username" }).click();
  await expect(page.getByLabel(/^Username/)).toHaveAttribute("aria-invalid", "true");
  const renamed = uniqueName("ren");
  await page.getByLabel(/^Username/).fill(renamed);
  await page.getByRole("button", { name: "Save username" }).click();
  await expect(page.getByText("Username updated.").first()).toBeVisible();
  // The 30-day window now applies, so the save button is gone rather than disabled.
  await expect(page.getByRole("button", { name: "Save username" })).toHaveCount(0);

  // VW-SET-002
  const email = `${renamed}@example.test`;
  await page.getByLabel(/^Email/).fill(email);
  // A permanent change re-authenticates (IMP-M10-12): a wrong password is refused, nothing changes.
  await page.locator('input[name="emailCurrentPassword"]').fill("not-my-password");
  await page.getByRole("button", { name: "Save email" }).click();
  await expect(page.getByText("Current password is incorrect.").first()).toBeVisible();
  await expect(page.getByText("Email updated.")).toHaveCount(0);
  await page.locator('input[name="emailCurrentPassword"]').fill("Correct-horse-9battery");
  await page.getByRole("button", { name: "Save email" }).click();
  await expect(page.getByText("Email updated.").first()).toBeVisible();

  // VW-SET-003: a wrong current password is reported on the form.
  await page.getByLabel(/^Current password/).fill("not-my-password");
  await page.getByLabel(/^New password/).fill("Another-horse-9battery");
  await page.getByLabel(/^Confirm new password/).fill("Another-horse-9battery");
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page.getByText("Current password is incorrect.").first()).toBeVisible();
  await expect(page.getByText("Password changed.")).toHaveCount(0);
  await page.getByLabel(/^Current password/).fill("Correct-horse-9battery");
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page.getByText("Password changed.").first()).toBeVisible();

  // VW-SET-004/005: the compose stack has no Google client, so no link is offered; and no Remove.
  await page.getByRole("tab", { name: "Sign-in" }).click();
  await expect(page.getByRole("heading", { name: "Sign-in methods" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Link Google account" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Remove/ })).toHaveCount(0);

  // VW-SET-006/006a: private hides the section toggles, public brings them back; both persist.
  await page.getByRole("tab", { name: "Privacy" }).click();
  await expect(page.getByRole("radio", { name: "Public" })).toHaveCount(4);
  for (const name of ["Game history", "Statistics", "Uploaded games", "Friends list"]) {
    await expect(page.getByText(name, { exact: true })).toBeVisible();
  }
  await page.getByRole("switch", { name: "Make my profile private" }).click();
  await expect(page.getByText("Privacy settings saved.").first()).toBeVisible();
  await expect(page.getByRole("radio", { name: "Public" })).toHaveCount(0);
  await page.reload();
  await page.getByRole("tab", { name: "Privacy" }).click();
  await expect(page.getByRole("switch", { name: "Make my profile private" })).toBeChecked();
  await page.getByRole("switch", { name: "Make my profile private" }).click();
  await expect(page.getByRole("radio", { name: "Public" })).toHaveCount(4);

  // FR-THM-001: the appearance choices are the browser's own and survive a reload.
  await page.getByRole("tab", { name: "Appearance" }).click();
  await page.getByRole("switch", { name: "Reduce motion" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-reduce-motion", "true");
  await page.reload();
  await page.getByRole("tab", { name: "Appearance" }).click();
  await expect(page.getByRole("switch", { name: "Reduce motion" })).toBeChecked();
  await expect(page.locator("html")).toHaveAttribute("data-reduce-motion", "true");

  // VW-SET-007: cancelling keeps the account; confirming deletes it and ends the session.
  await page.getByRole("tab", { name: "Delete account" }).click();
  await expect(page.getByRole("button", { name: "Delete my account" })).toBeDisabled();
  await page.locator('input[name="deleteAccountPassword"]').fill("Another-horse-9battery");
  await page.getByRole("button", { name: "Delete my account" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Account settings" })).toBeVisible();
  await page.getByRole("button", { name: "Delete my account" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete account" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/settings");
  await expect(page).toHaveURL(/\/login\?redirect=%2Fsettings$/);

  expect(errors).toEqual([]);
  await me.context.close();
});
