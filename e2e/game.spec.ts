import { expect, test } from "./fixtures";
import {
  createRoom,
  enterFromList,
  gameFrame,
  login,
  listenOnTopics,
  newPlayer,
  outsiderFrames,
  playAsGuest,
  playCell,
  readyAndStart,
  type Player,
} from "./support";

// One full game with four independent people: A (seeded `carol`, host), B (seeded `bob`),
// C (guest spectator) and D (seeded `dave`, never in the room). A is seeded, not registered: a
// registration is 3 per address per hour, and `settings.spec.ts` needs the one a run can spare.
test("create, join, ready, start and play Tic-Tac-Toe to a win", async ({ browser }) => {
  const a = await newPlayer(browser, "A");
  const b = await newPlayer(browser, "B");
  const c = await newPlayer(browser, "C");
  const d = await newPlayer(browser, "D");
  const usernameA = "carol";
  await login(a, usernameA);
  await login(b, "bob");
  await playAsGuest(c);
  await login(d, "dave");

  // Contexts really are separate people.
  const cookieOf = async (p: Player) =>
    (await p.context.cookies()).find((k) => k.name === "turnbase_session")?.value;
  const cookies = await Promise.all([a, b, c, d].map(cookieOf));
  expect(new Set(cookies).size).toBe(4);

  const played = async () =>
    (
      (await (await a.page.request.get(`/api/users/${usernameA}/statistics`)).json()) as {
        totalPlayed: number;
      }
    ).totalPlayed;
  const playedBefore = await played();

  const roomId = await createRoom(a, { spectating: true });
  await listenOnTopics(d.page, [`/topic/room.${roomId}`]);

  await enterFromList(b, usernameA, "Join");
  await enterFromList(c, usernameA, "Spectate");
  const lobbyPlayers = a.page.getByRole("list", { name: "Players" });
  await expect(lobbyPlayers.getByRole("listitem")).toHaveCount(2);
  await expect(a.page.getByRole("list", { name: "Spectators" }).getByRole("listitem")).toHaveCount(
    1,
  );

  await readyAndStart(a, b);
  await expect(gameFrame(c.page).locator("[data-cell]")).toHaveCount(9);

  // X takes the top row, O plays the middle row: X wins on the fifth move.
  const spectatorCells = gameFrame(c.page).locator("[data-cell]:enabled");
  const movers: Player[] = [];
  for (const cell of [0, 3, 1, 4, 2]) {
    movers.push(await playCell([a, b], cell));
    // The spectator watches every move and can act on none of them.
    await expect(gameFrame(c.page).locator(`[data-cell="${String(cell)}"]`)).not.toHaveText("");
    expect(await spectatorCells.count()).toBe(0);
  }
  // The turns alternated: three marks by one player, two by the other.
  expect(movers[0]).toBe(movers[2]);
  expect(movers[0]).toBe(movers[4]);
  expect(movers[1]).toBe(movers[3]);
  expect(movers[0]).not.toBe(movers[1]);

  for (const p of [a, b]) {
    await expect(p.page.getByText("The game is over.")).toBeVisible();
  }
  // The results payload reaches each frame: the winner (X, three marks) and the loser are told, and
  // the spectator is told whose mark won.
  const winner = movers[0];
  const loser = movers[1];
  await expect(gameFrame(winner.page).getByRole("status")).toHaveText("You won.");
  await expect(gameFrame(loser.page).getByRole("status")).toHaveText("You lost.");
  await expect(gameFrame(c.page).getByRole("status")).toHaveText("X won.");

  // Nothing of the room or the game reached the outsider.
  expect(await outsiderFrames(d.page)).toEqual([]);

  // History and statistics for the registered player, whichever mark A drew.
  await a.page.goto(`/users/${usernameA}`);
  await a.page.getByRole("tab", { name: "History" }).click();
  await expect(a.page.getByRole("list", { name: "Finished games" })).toBeVisible();
  await expect(a.page.getByText("Tic-Tac-Toe").first()).toBeVisible();
  await expect(a.page.getByText(/Victory|Defeat/).first()).toBeVisible();
  await expect.poll(played).toBe(playedBefore + 1);

  for (const p of [a, b, c, d]) await p.context.close();
});
