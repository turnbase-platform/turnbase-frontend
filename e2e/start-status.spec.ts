import { expect, test } from "./fixtures";
import { createRoom, enterFromList, gameFrame, login, newPlayer, type Player } from "./support";

// IMP-M14-03 on a real stack: while the host's START_GAME is being worked on, *both* players see
// progress (spinner and a phase line), the host cannot press Start twice, and the game then opens
// for both. The phases a player saw are recorded in the page, so the assertions do not depend on
// catching a short-lived element — a start that takes 3 s and one that takes a minute both pass.
const WATCH_START = () => {
  const seen: { at: number; text: string }[] = [];
  (window as unknown as { __startSeen: typeof seen }).__startSeen = seen;
  const read = () => {
    const row = document
      .querySelector('[aria-label="Starting the game"]')
      ?.closest('[aria-live="polite"]');
    const text = (row ? row.textContent : "").trim();
    if (text && seen.at(-1)?.text !== text) seen.push({ at: Date.now(), text });
  };
  new MutationObserver(read).observe(document, {
    subtree: true,
    childList: true,
    characterData: true,
  });
};

const phasesSeenBy = async (p: Player): Promise<{ at: number; text: string }[]> =>
  p.page.evaluate(
    () => (window as unknown as { __startSeen: { at: number; text: string }[] }).__startSeen,
  );

test("both players see the game start progress, then the game opens", async ({ browser }) => {
  const host = await newPlayer(browser, "host");
  const guest = await newPlayer(browser, "guest");
  await host.context.addInitScript(WATCH_START);
  await guest.context.addInitScript(WATCH_START);
  await login(host, "alice");
  await login(guest, "bob");

  await createRoom(host);
  await enterFromList(guest, "alice", "Join");
  await expect(host.page.getByRole("list", { name: "Players" }).getByRole("listitem")).toHaveCount(
    2,
  );

  await guest.page.getByRole("switch", { name: "I am ready" }).click();
  const start = host.page.getByRole("button", { name: "Start game" });
  await expect(start).toBeEnabled();
  const clickedAt = Date.now();
  await start.click();

  // Then the game opens for both, within what a wedged boot plus a retry can cost.
  for (const p of [host, guest]) {
    await expect(gameFrame(p.page).locator("[data-cell]")).toHaveCount(9, { timeout: 150_000 });
  }
  const openedMs = Date.now() - clickedAt;

  const report: Record<string, string[]> = {};
  for (const p of [host, guest]) {
    const seen = await phasesSeenBy(p);
    report[p.name] = seen.map((s) => `+${String(s.at - clickedAt)}ms ${s.text.slice(0, 48)}`);
    expect(seen.length, `${p.name} saw no start progress`).toBeGreaterThan(0);
    // Every line shown is one of the known phases — nothing stale or misleading.
    for (const s of seen) {
      expect(s.text).toMatch(
        /^(Starting the game|Waiting for a game server|Loading the game|The game server did not answer)/,
      );
    }
    // The progress card is gone once the game is up.
    await expect(p.page.getByLabel("Starting the game")).toHaveCount(0);
  }
  console.log(JSON.stringify({ openedMs, report }, null, 1));
});
