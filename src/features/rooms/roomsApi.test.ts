import { afterEach, describe, expect, it, vi } from "vitest";
import { installFakeApi } from "../../test/fakeApi";
import { ApiError } from "../../shared/api";
import { createRoom, getRoom, joinRoom, leaveRoom, listRooms } from "./roomsApi";

afterEach(() => {
  vi.unstubAllGlobals();
});

const room = {
  roomId: "room-1",
  gameId: "g-1",
  gameName: "Chess",
  gameVersion: "1.0.0",
  state: "LOBBY",
  visibility: "PUBLIC",
  hostUserId: "u-1",
  hostUsername: "alice",
  spectatingEnabled: true,
  spectatorCapacity: 4,
  spectatorCount: 0,
  playerCount: 1,
  playerCapacity: 2,
  minPlayers: 2,
  maxPlayers: 2,
  canJoin: true,
  canSpectate: true,
  version: 1,
  createdAt: "2026-09-27T00:00:00Z",
};

describe("listRooms", () => {
  it("builds a query string from the given filters, repeating array values", async () => {
    const { calls } = installFakeApi({
      "GET /api/rooms?status=LOBBY&status=IN_PROGRESS&page=2": {
        body: {
          content: [],
          pagination: { page: 2, size: 20, totalElements: 0, totalPages: 0 },
          reservedSlot: null,
        },
      },
    });
    await listRooms({ status: ["LOBBY", "IN_PROGRESS"], page: 2 });
    expect(calls).toHaveLength(1);
  });
});

describe("getRoom / createRoom", () => {
  it("captures the X-TurnBase-Room-Instance affinity header on get", async () => {
    installFakeApi({
      "GET /api/rooms/room-1": { body: room, headers: { "X-TurnBase-Room-Instance": "pod-3" } },
    });
    const { room: got, instanceHint } = await getRoom("room-1");
    expect(got.roomId).toBe("room-1");
    expect(instanceHint).toBe("pod-3");
  });

  it("has no affinity hint when the header is absent", async () => {
    installFakeApi({ "GET /api/rooms/room-1": { body: room } });
    const { instanceHint } = await getRoom("room-1");
    expect(instanceHint).toBeNull();
  });

  it("captures the affinity header on create", async () => {
    installFakeApi({
      "POST /api/rooms": {
        status: 201,
        body: room,
        headers: { "X-TurnBase-Room-Instance": "pod-5" },
      },
    });
    const { instanceHint } = await createRoom({ gameId: "g-1", visibility: "PUBLIC" });
    expect(instanceHint).toBe("pod-5");
  });
});

describe("joinRoom", () => {
  it("captures the affinity header on a successful join", async () => {
    installFakeApi({
      "POST /api/rooms/room-1/participants": {
        body: { room, releasedRoom: null },
        headers: { "X-TurnBase-Room-Instance": "pod-9" },
      },
    });
    const { result, instanceHint } = await joinRoom("room-1", "PLAYER");
    expect(result.room.roomId).toBe("room-1");
    expect(instanceHint).toBe("pod-9");
  });

  it("retries transparently on a 503 with retryAfterMs, instead of surfacing failure", async () => {
    let attempts = 0;
    installFakeApi({
      "POST /api/rooms/room-1/participants": () => {
        attempts += 1;
        if (attempts < 3) {
          return { status: 503, body: { status: 503, title: "busy", retryAfterMs: 50 } };
        }
        return { body: { room, releasedRoom: null } };
      },
    });
    const wait = vi.fn().mockResolvedValue(undefined);
    const { result } = await joinRoom("room-1", "PLAYER", { wait });
    expect(result.room.roomId).toBe("room-1");
    expect(attempts).toBe(3);
    expect(wait).toHaveBeenCalledTimes(2);
    expect(wait).toHaveBeenCalledWith(50);
  });

  it("surfaces a 503 with no retryAfterMs immediately, since it is not this retry contract", async () => {
    installFakeApi({
      "POST /api/rooms/room-1/participants": { status: 503, body: { status: 503, title: "down" } },
    });
    const wait = vi.fn();
    await expect(joinRoom("room-1", "PLAYER", { wait })).rejects.toBeInstanceOf(ApiError);
    expect(wait).not.toHaveBeenCalled();
  });

  it("surfaces a non-retryable error immediately", async () => {
    installFakeApi({
      "POST /api/rooms/room-1/participants": { status: 409, body: { status: 409, title: "full" } },
    });
    await expect(joinRoom("room-1", "PLAYER")).rejects.toBeInstanceOf(ApiError);
  });

  it("carries the invite code on the query string when given", async () => {
    const { calls } = installFakeApi({
      "POST /api/rooms/room-1/participants?inviteCode=ABC123": {
        body: { room, releasedRoom: null },
      },
    });
    await joinRoom("room-1", "SPECTATOR", { inviteCode: "ABC123" });
    expect(calls[0]?.body).toEqual({ role: "SPECTATOR" });
  });
});

describe("leaveRoom", () => {
  it("is a 204 no matter whether the caller was in the room", async () => {
    installFakeApi({ "DELETE /api/rooms/room-1/participants/me": { status: 204 } });
    await expect(leaveRoom("room-1")).resolves.toBeUndefined();
  });
});
