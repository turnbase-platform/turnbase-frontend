import { expect, test, type Page } from "@playwright/test";
import { createRoom, leaveQuietly, login, newPlayer, playAsGuest, roomIdOf } from "./support";

// IMP-M8-14: the bell and panel (VW-NAV-005, VW-NOTIF-001…004, FR-NOTIF-002…005, FR-INV-003,
// FR-FREQ-002) as Unauth, Guest and the seeded `alice`/`bob` (friends), `carol` and `dave`
// (strangers). Every request is declined or dismissed, so the spec leaves no state behind.

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

const bell = (page: Page) =>
  page.getByRole("banner").getByRole("button", { name: /Notifications/ });

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

/** Clears whatever an earlier run left, so the spec starts from an empty panel. */
async function clearAll(page: Page) {
  await page.evaluate(async () => {
    const list = (await (await fetch("/api/notifications?page=1&size=25")).json()) as {
      content: { notificationId: string }[];
    };
    for (const n of list.content) {
      await fetch(`/api/notifications/${n.notificationId}`, { method: "DELETE" });
    }
    // A request left pending by an interrupted run would answer the next one with 409.
    const requests = (await (await fetch("/api/friend-requests")).json()) as {
      content: { requestId: string }[];
    };
    for (const r of requests.content) {
      await fetch(`/api/friend-requests/${r.requestId}`, { method: "DELETE" });
    }
  });
}

test("Unauth: no bell", async ({ browser }) => {
  const { page } = await newPlayer(browser, "unauth");
  await page.goto("/games");
  await expect(
    page
      .getByRole("link", { name: "Log in" })
      .or(page.getByRole("button", { name: "Log in" }))
      .first(),
  ).toBeVisible();
  await expect(bell(page)).toHaveCount(0);
});

test("Guest: a bell and a panel with no actions, at 400 px", async ({ browser }) => {
  const guest = await newPlayer(browser, "guest");
  const errors = watchConsole(guest.page);
  await playAsGuest(guest);
  await guest.page.setViewportSize({ width: 400, height: 800 });

  await expect(bell(guest.page)).toBeVisible();
  await bell(guest.page).click();
  await expect(guest.page.getByText("You have no notifications.")).toBeVisible();
  await expect(guest.page.getByRole("button", { name: "Mark all read" })).toBeVisible();
  for (const name of ["Join", "Accept", "Decline"]) {
    await expect(guest.page.getByRole("button", { name, exact: true })).toHaveCount(0);
  }
  await expectNoHorizontalScroll(guest.page);
  expect(errors).toEqual([]);
  await guest.context.close();
});

test("Registered: a friend request arrives live, is declined, and the answer is read and dismissed", async ({
  browser,
}) => {
  const carol = await newPlayer(browser, "carol");
  const dave = await newPlayer(browser, "dave");
  const errors = watchConsole(dave.page);
  await login(carol, "carol");
  await login(dave, "dave");
  await clearAll(carol.page);
  await clearAll(dave.page);
  await dave.page.reload();
  await expect(bell(dave.page)).toBeVisible();
  await dave.page.setViewportSize({ width: 400, height: 800 });

  // The platform pushes nothing live for a persisted notification (IMP-M8-18 builds it, and
  // moves the no-reload assertion here); until then the badge is read on load.
  expect(await post(carol.page, "/api/friend-requests", { recipientUsername: "dave" })).toBe(201);
  await dave.page.reload();
  await expect(bell(dave.page)).toHaveAccessibleName(/1 unread/);

  await bell(dave.page).click();
  await expect(dave.page.getByText("carol sent you a friend request.")).toBeVisible();
  await expectNoHorizontalScroll(dave.page);
  await dave.page.getByRole("button", { name: "Decline" }).click();
  await expect(dave.page.getByText("carol sent you a friend request.")).toHaveCount(0);
  await expect(dave.page.getByText("You have no notifications.")).toBeVisible();

  await carol.page.reload();
  await expect(bell(carol.page)).toHaveAccessibleName(/1 unread/);
  await bell(carol.page).click();
  await expect(carol.page.getByText("dave declined your friend request.")).toBeVisible();
  await carol.page.getByRole("button", { name: "Mark read" }).click();
  await expect(carol.page.getByRole("button", { name: "Mark read" })).toHaveCount(0);

  // Persisted: a reload keeps it, read.
  await carol.page.reload();
  await expect(bell(carol.page)).toHaveAccessibleName("Notifications");
  await bell(carol.page).click();
  await expect(carol.page.getByText("dave declined your friend request.")).toBeVisible();
  await expect(carol.page.getByRole("button", { name: "Mark read" })).toHaveCount(0);
  await carol.page.getByRole("button", { name: "Dismiss" }).click();
  await carol.page.reload();
  await bell(carol.page).click();
  await expect(carol.page.getByText("You have no notifications.")).toBeVisible();

  expect(errors).toEqual([]);
  await carol.context.close();
  await dave.context.close();
});

test("Registered: a room invitation is joined from the panel", async ({ browser }) => {
  const alice = await newPlayer(browser, "alice");
  const bob = await newPlayer(browser, "bob");
  await login(alice, "alice");
  await login(bob, "bob");
  await clearAll(bob.page);
  await bob.page.reload();
  const roomId = await createRoom(alice);

  expect(
    await post(alice.page, `/api/rooms/${roomId}/invitations`, { inviteeUsername: "bob" }),
  ).toBe(201);
  await bob.page.reload();
  await expect(bell(bob.page)).toHaveAccessibleName(/1 unread/);
  await bell(bob.page).click();
  await expect(bob.page.getByText(/alice invited you to play/)).toBeVisible();
  await bob.page.getByRole("button", { name: "Join", exact: true }).click();
  await expect(bob.page).toHaveURL(new RegExp(`/rooms/${roomId}$`));
  expect(roomIdOf(bob.page)).toBe(roomId);

  await leaveQuietly([alice, bob], roomId);
});
