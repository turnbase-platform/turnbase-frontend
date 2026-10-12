import { expect, test } from "./fixtures";
import type { Page } from "@playwright/test";
import { newPlayer, playAsGuest, uniqueName } from "./support";

// IMP-M8-07: /login, /register, /auth/complete-registration and Play as Guest
// (VW-LOGIN-001…004, VW-REG-001…003, VW-OAUTHCOMP-001…002, RR-10). At most one real registration
// attempt per run; the rate-limit wording is checked against a stubbed 429 so it spends nothing.

function watchConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (m) => {
    // The browser logs every non-2xx fetch it was told to expect; those are not app faults.
    if ((m.type() === "error" || m.type() === "warning") && !/status of (4\d\d)/.test(m.text())) {
      errors.push(m.text());
    }
  });
  page.on("response", (r) => {
    if (r.status() >= 500) errors.push(`${String(r.status())} ${r.url()}`);
  });
  return errors;
}

/** Polled: a resize reaches the header's narrow layout one frame after the viewport changes. */
async function expectNoHorizontalScroll(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      ),
    )
    .toBeLessThanOrEqual(0);
}

test("Unauth: login — rows, redirect, wrong password, 429 wait", async ({ browser }) => {
  const { page } = await newPlayer(browser, "unauth");
  const errors = watchConsole(page);
  await page.goto("/login?redirect=%2Fgames");
  await expect(page.getByRole("heading", { level: 1, name: "Welcome back" })).toBeVisible();
  await expect(page.getByLabel(/Username or email/)).toBeVisible();
  await expect(page.getByLabel(/^Password/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Create an account" })).toHaveAttribute(
    "href",
    "/register?redirect=%2Fgames",
  );
  // VW-LOGIN-002: this stack has no Google client secret, so the button is absent — not disabled.
  await expect(page.getByRole("link", { name: "Continue with Google" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Continue with Google" })).toHaveCount(0);

  await page.getByLabel(/Username or email/).fill("alice");
  await page.getByLabel(/^Password/).fill("not-the-password");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByText("Incorrect username, email or password.")).toBeVisible();

  await page.route("**/api/auth/login", (route) =>
    route.fulfill({
      status: 429,
      headers: { "Retry-After": "806", "Content-Type": "application/json" },
      body: JSON.stringify({ type: "rate-limit-exceeded", status: 429 }),
    }),
  );
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByText("Too many attempts. Please try again in 14 minutes.")).toBeVisible();
  await page.unroute("**/api/auth/login");

  // VW-LOGIN-004: success lands on the validated redirect.
  await page.getByLabel(/^Password/).fill("password");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/games$/);

  await page.setViewportSize({ width: 400, height: 800 });
  await page.context().clearCookies();
  await page.goto("/login");
  await expectNoHorizontalScroll(page);
  expect(errors).toEqual([]);
});

test("Unauth: register — rows, server field error beside its field, mismatch", async ({
  browser,
}) => {
  const { page } = await newPlayer(browser, "unauth");
  const errors = watchConsole(page);
  await page.goto("/register");
  await expect(page.getByRole("heading", { level: 1, name: "Create your account" })).toBeVisible();
  for (const label of [/^Username/, /^Email/, /^Password/, /^Confirm password/]) {
    await expect(page.getByLabel(label)).toBeVisible();
  }
  await expect(page.getByRole("link", { name: "Log in" }).last()).toHaveAttribute("href", "/login");
  await expect(page.getByRole("link", { name: "Continue with Google" })).toHaveCount(0);

  // Client-side mismatch costs no request.
  await page.getByLabel(/^Password/).fill("Correct-horse-9battery");
  await page.getByLabel(/^Confirm password/).fill("different");
  await expect(page.getByText("Passwords do not match.").first()).toBeVisible();

  // A 400 `errors[]` entry lands on its own field (error-handling.md); stubbed, so it spends nothing.
  const name = uniqueName("e2e");
  await page.getByLabel(/^Username/).fill("alice");
  await page.getByLabel(/^Email/).fill(`${name}@example.test`);
  await page.getByLabel(/^Confirm password/).fill("Correct-horse-9battery");
  await page.route("**/api/auth/register", (route) =>
    route.fulfill({
      status: 400,
      contentType: "application/problem+json",
      body: JSON.stringify({
        type: "https://turnbase.io/errors/validation-failed",
        status: 400,
        errors: [{ field: "email", message: "Enter a valid email address." }],
      }),
    }),
  );
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByLabel(/^Email/)).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText("Enter a valid email address.").first()).toBeVisible();
  await page.unroute("**/api/auth/register");

  // A taken username is a plain 409 (input-validation.md), shown as the server's own sentence.
  // Stubbed: every 4xx on a Tier 1 path counts toward the address's 5 failures per 24 h, and the
  // run has only two to spend (the wrong password above, the wrong current password in
  // `settings.spec.ts`) if it is to be repeatable (IMP-M8-16).
  await page.route("**/api/auth/register", (route) =>
    route.fulfill({
      status: 409,
      contentType: "application/problem+json",
      body: JSON.stringify({
        type: "https://turnbase.io/errors/conflict",
        title: "Conflict",
        status: 409,
        detail: "Username already taken.",
      }),
    }),
  );
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Username already taken.").first()).toBeVisible();
  await page.unroute("**/api/auth/register");

  await page.setViewportSize({ width: 400, height: 900 });
  await expectNoHorizontalScroll(page);
  expect(errors).toEqual([]);
});

test("Unauth: complete-registration without a pending registration goes to /login", async ({
  browser,
}) => {
  const { page } = await newPlayer(browser, "unauth");
  await page.goto("/auth/complete-registration");
  await expect(page).toHaveURL(/\/login$/);
});

test("Guest: Play as Guest, and the auth views bounce a signed-in visitor", async ({ browser }) => {
  const player = await newPlayer(browser, "guest");
  await playAsGuest(player);
  for (const path of ["/login", "/register"]) {
    await player.page.goto(path);
    await expect(player.page).toHaveURL(/\/rooms$/);
  }
});
