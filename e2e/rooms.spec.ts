import { expect, test } from "./fixtures";
import type { Page } from "@playwright/test";
import {
  awaitRefilledBudgets,
  createRoom,
  dropSocket,
  enterFromList,
  leaveQuietly,
  login,
  newPlayer,
  playAsGuest,
  readyAndStart,
  roomIdOf,
} from "./support";

// IMP-M8-09: /rooms and /rooms/join/:code (VW-ROOMS-001…005, VW-JOIN-001…003, FR-LIST-006/007,
// FR-REJOIN-002, RR-07's rooms table). Unauth, Guest and seeded `alice`/`bob`.

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

async function createRoomWith(
  host: Awaited<ReturnType<typeof newPlayer>>,
  visibility: string,
): Promise<string> {
  const { page } = host;
  await page.goto("/games");
  await page
    .getByRole("link", { name: /Tic-Tac-Toe/ })
    .first()
    .click();
  await page.getByRole("button", { name: "Create room" }).click();
  await page.getByRole("radio", { name: visibility }).check();
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await expect(page).toHaveURL(/\/rooms\/[0-9a-f-]{36}$/);
  return roomIdOf(page);
}

test("Unauth: /rooms and a join link go to login with the way back", async ({ browser }) => {
  const { page } = await newPlayer(browser, "unauth");
  await page.goto("/rooms");
  await expect(page).toHaveURL(/\/login\?redirect=%2Frooms$/);
  await page.goto("/rooms/join/ABCD1234");
  await expect(page).toHaveURL(/\/login\?redirect=%2Frooms%2Fjoin%2FABCD1234$/);
});

test("Guest at 400 px: no Friends Only room, Join and Spectate by flag, table stays inside the page", async ({
  browser,
}) => {
  const alice = await newPlayer(browser, "alice");
  const carol = await newPlayer(browser, "carol");
  await login(alice, "alice");
  await login(carol, "carol");
  const aliceRoom = await createRoom(alice, { spectating: true });
  const carolRoom = await createRoomWith(carol, "Friends Only");
  const guest = await newPlayer(browser, "guest");
  const errors = watchConsole(guest.page);
  await playAsGuest(guest);
  const { page } = guest;
  await page.setViewportSize({ width: 400, height: 800 });
  try {
    await page.goto("/rooms");
    await expect(page.getByRole("heading", { level: 1, name: "Active rooms" })).toBeVisible();
    await expect(page.getByLabel("Search rooms")).toBeVisible();
    const row = page.getByRole("row", { name: /alice/ }).first();
    await expect(async () => {
      await page.getByRole("button", { name: "Refresh" }).click();
      await expect(row).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 20_000 });
    await expect(row.getByRole("button", { name: /^Join Tic-Tac-Toe/ })).toBeVisible();
    await expect(row.getByRole("button", { name: /^Spectate Tic-Tac-Toe/ })).toBeVisible();
    // FR-LIST-006: carol's Friends Only room is not in a Guest's list.
    await expect(page.getByRole("button", { name: /hosted by carol/ })).toHaveCount(0);
    await expectNoHorizontalScroll(page);
    await page.getByLabel("Search rooms").fill("zzz-no-such-host");
    await expect(page.getByText("No rooms to join right now")).toBeVisible();
    await expectNoHorizontalScroll(page);
    expect(errors).toEqual([]);
  } finally {
    await leaveQuietly([alice], aliceRoom);
    await leaveQuietly([carol], carolRoom);
  }
});

test("join link: a wrong code, then a full-room code, each show their own reason", async ({
  browser,
}) => {
  const guest = await newPlayer(browser, "dave");
  await login(guest, "dave");
  await guest.page.goto("/rooms/join/NOSUCHCODE1");
  await expect(
    guest.page.getByText(/not valid, has expired, or the room has closed/),
  ).toBeVisible();
  await expect(guest.page.getByRole("link", { name: "Browse active rooms" })).toBeVisible();

  // A full, non-spectatable room: alice hosts, bob joins, the invite code now offers nothing.
  const alice = await newPlayer(browser, "alice");
  const bob = await newPlayer(browser, "bob");
  let roomId: string | undefined;
  try {
    await login(alice, "alice");
    await login(bob, "bob");
    roomId = await createRoomWith(alice, "Invite Only");
    const code = await alice.page.evaluate(async (id) => {
      const r = await fetch(`/api/rooms/${id}`);
      return ((await r.json()) as { inviteCode: string }).inviteCode;
    }, roomId);
    await bob.page.goto(`/rooms/join/${code}`);
    await expect(bob.page).toHaveURL(new RegExp(`/rooms/${roomId}$`));
    await guest.page.goto(`/rooms/join/${code}`);
    await expect(guest.page.getByText(/no available role/)).toBeVisible();
  } finally {
    await leaveQuietly([alice, bob], roomId);
  }
});

test.describe("reconnection card", () => {
  test.setTimeout(150_000);
  test.beforeEach(awaitRefilledBudgets);

  test("a player dropped mid-game sees the pinned card on /rooms until the slot is released", async ({
    browser,
  }) => {
    const a = await newPlayer(browser, "alice");
    const b = await newPlayer(browser, "bob");
    let roomId: string | undefined;
    try {
      await login(a, "alice");
      await login(b, "bob");
      roomId = await createRoom(a);
      await enterFromList(b, "alice", "Join");
      await readyAndStart(a, b);

      expect(await dropSocket(b.page)).toBeGreaterThan(0);
      await b.page.goto("/rooms");
      const card = b.page.getByText(/disconnected from Tic-Tac-Toe/);
      await expect(async () => {
        await b.page.getByRole("button", { name: "Refresh" }).click();
        await expect(card).toBeVisible({ timeout: 2_000 });
      }).toPass({ timeout: 20_000 });

      // VW-ROOMS-005: the card goes when the slot is released. Nothing pushes to this view
      // (FR-LIST-005), so the page refreshes itself once the 60 s grace period has run out.
      await expect(card).toBeHidden({ timeout: 75_000 });
      await expect(b.page.getByRole("heading", { level: 1, name: "Active rooms" })).toBeVisible();
    } finally {
      await leaveQuietly([a, b], roomId);
    }
  });
});
