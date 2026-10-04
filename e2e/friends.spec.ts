import { expect, test } from "./fixtures";
import type { Page } from "@playwright/test";
import { login, newPlayer, playAsGuest } from "./support";

// IMP-M8-12: /friends (VW-FREN-001…005) as Unauth, Guest and the seeded `alice`/`bob` (friends),
// `carol` and `dave` (strangers). Every request is declined, so the spec leaves no state behind.

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

async function post(page: Page, path: string, body: unknown): Promise<number> {
  return page.evaluate(
    async ([url, payload]) => {
      const response = await fetch(url as string, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return response.status;
    },
    [path, body],
  );
}

/** Drops whatever pending request an interrupted run left, so the spec starts clean. */
async function clearRequests(page: Page) {
  await page.evaluate(async () => {
    const requests = (await (await fetch("/api/friend-requests")).json()) as {
      content: { requestId: string }[];
    };
    for (const r of requests.content) {
      await fetch(`/api/friend-requests/${r.requestId}`, { method: "DELETE" });
    }
  });
}

test("Unauth is sent to log in and back", async ({ browser }) => {
  const { page, context } = await newPlayer(browser, "unauth");
  await page.goto("/friends");
  await expect(page).toHaveURL(/\/login\?redirect=%2Ffriends$/);
  await context.close();
});

test("Guest sees the registered-only message and no Friends link", async ({ browser }) => {
  const guest = await newPlayer(browser, "guest");
  await playAsGuest(guest);
  await guest.page.goto("/friends");
  await expect(guest.page.getByText("This feature requires a registered account.")).toBeVisible();
  await expect(guest.page.getByRole("button", { name: /^(Accept|Decline|Remove)/ })).toHaveCount(0);
  await guest.context.close();
});

test("Registered: the friend list, at 400 px, with a link to the profile", async ({ browser }) => {
  const alice = await newPlayer(browser, "alice");
  const errors = watchConsole(alice.page);
  await login(alice, "alice");
  await alice.page.setViewportSize({ width: 400, height: 800 });
  await alice.page.goto("/friends");

  await expect(alice.page.getByRole("heading", { level: 1, name: "Friends" })).toBeVisible();
  await expect(alice.page.getByText("bob", { exact: true })).toBeVisible();
  await expect(alice.page.getByRole("link", { name: "View profile" }).first()).toHaveAttribute(
    "href",
    "/users/bob",
  );
  await expect(alice.page.getByRole("button", { name: "Remove bob" })).toBeVisible();
  await expect(alice.page.getByText(/Could not/)).toHaveCount(0);
  await expectNoHorizontalScroll(alice.page);
  expect(errors).toEqual([]);
  await alice.context.close();
});

test("Registered: a request is received, declined, and the sender sees it go", async ({
  browser,
}) => {
  const carol = await newPlayer(browser, "carol");
  const dave = await newPlayer(browser, "dave");
  const errors = watchConsole(dave.page);
  await login(carol, "carol");
  await login(dave, "dave");
  await clearRequests(carol.page);
  await clearRequests(dave.page);

  expect(await post(carol.page, "/api/friend-requests", { recipientUsername: "dave" })).toBe(201);

  await carol.page.goto("/friends");
  await expect(carol.page.getByRole("heading", { name: "Sent requests" })).toBeVisible();
  await expect(carol.page.getByRole("button", { name: "Cancel request to dave" })).toBeVisible();

  await dave.page.setViewportSize({ width: 400, height: 800 });
  await dave.page.goto("/friends");
  await expect(dave.page.getByRole("button", { name: "Accept carol" })).toBeVisible();
  await expectNoHorizontalScroll(dave.page);
  await dave.page.getByRole("button", { name: "Decline carol" }).click();
  await expect(dave.page.getByText("No pending requests")).toBeVisible();
  await expect(dave.page.getByText(/Could not/)).toHaveCount(0);

  await carol.page.reload();
  await expect(carol.page.getByRole("heading", { name: "Sent requests" })).toHaveCount(0);

  expect(errors).toEqual([]);
  await carol.context.close();
  await dave.context.close();
});

test("Registered: accept makes friends, remove ends it", async ({ browser }) => {
  const carol = await newPlayer(browser, "carol");
  const dave = await newPlayer(browser, "dave");
  await login(carol, "carol");
  await login(dave, "dave");
  await clearRequests(carol.page);
  await clearRequests(dave.page);

  expect(await post(dave.page, "/api/friend-requests", { recipientUsername: "carol" })).toBe(201);
  await carol.page.goto("/friends");
  await carol.page.getByRole("button", { name: "Accept dave" }).click();
  await expect(carol.page.getByRole("button", { name: "Remove dave" })).toBeVisible();
  await expect(carol.page.getByText("No pending requests")).toBeVisible();

  await carol.page.getByRole("button", { name: "Remove dave" }).click();
  await expect(carol.page.getByText("No friends yet")).toBeVisible();
  await expect(carol.page.getByText(/Could not/)).toHaveCount(0);

  await dave.page.goto("/friends");
  await expect(dave.page.getByText("No friends yet")).toBeVisible();
  await carol.context.close();
  await dave.context.close();
});
