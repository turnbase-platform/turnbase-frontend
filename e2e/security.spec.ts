import { request as httpRequest } from "node:http";
import { expect, test } from "./fixtures";
import { newPlayer, playAsGuest, ORIGIN } from "./support";

const FOREIGN = "http://evil.example";

/** One raw WebSocket upgrade: a browser cannot forge `Origin`, so this speaks HTTP directly. */
function upgrade(cookie: string, origin: string): Promise<number> {
  const url = new URL(ORIGIN);
  return new Promise((resolve, reject) => {
    const req = httpRequest({
      host: "127.0.0.1",
      port: url.port || 80,
      path: "/ws",
      headers: {
        Host: url.host,
        Origin: origin,
        Cookie: cookie,
        Connection: "Upgrade",
        Upgrade: "websocket",
        "Sec-WebSocket-Version": "13",
        "Sec-WebSocket-Key": Buffer.from("e2e-origin-chk-1").toString("base64"),
      },
    });
    req.on("upgrade", (_res, socket) => {
      socket.destroy();
      resolve(101);
    });
    req.on("response", (res) => {
      res.resume();
      resolve(res.statusCode ?? 0);
    });
    req.on("error", reject);
    req.end();
  });
}

test("a foreign Origin is refused on REST and on the WebSocket upgrade", async ({ browser }) => {
  const player = await newPlayer(browser, "origin");
  await playAsGuest(player);
  const cookies = await player.context.cookies();
  const cookie = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

  // Unauthenticated mutation, foreign origin.
  const guest = await player.page.request.post("/api/auth/guest", {
    headers: { Origin: FOREIGN },
  });
  expect(guest.status()).toBe(403);

  // Authenticated mutation, foreign origin: refused before it reaches the handler.
  const created = await player.page.request.post("/api/rooms", {
    headers: { Origin: FOREIGN },
    data: { gameId: "2cc66e36-52e6-4144-9a10-09d09c982ce4", visibility: "PUBLIC" },
  });
  expect([400, 403]).toContain(created.status());

  // The same upgrade succeeds from the platform's own origin — so the 403 below is the Origin.
  expect(await upgrade(cookie, ORIGIN)).toBe(101);
  expect(await upgrade(cookie, FOREIGN)).toBe(403);
  await player.context.close();
});
