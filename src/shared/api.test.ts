import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch, denialMessage, onUnauthorized } from "./api";
import { installFakeApi } from "../test/fakeApi";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("apiFetch", () => {
  it("sends JSON with the same-origin credentials mode and parses the answer", async () => {
    const { calls } = installFakeApi({ "POST /api/x": { status: 201, body: { ok: true } } });

    await expect(apiFetch("/api/x", { method: "POST", body: { a: 1 } })).resolves.toEqual({
      ok: true,
    });
    expect(calls[0]).toEqual({ method: "POST", path: "/api/x", body: { a: 1 } });
    const init = vi.mocked(fetch).mock.calls[0]?.[1];
    expect(init?.credentials).toBe("same-origin");
    expect(init?.headers).toEqual({ "Content-Type": "application/json" });
  });

  it("returns undefined for 204", async () => {
    installFakeApi({ "POST /api/y": { status: 204 } });
    await expect(apiFetch("/api/y", { method: "POST" })).resolves.toBeUndefined();
  });

  it("raises ApiError carrying the Problem Details", async () => {
    installFakeApi({
      "POST /api/z": {
        status: 400,
        body: { type: "validation-failed", errors: [{ field: "username", message: "taken" }] },
      },
    });

    const error = await apiFetch("/api/z", { method: "POST" }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(400);
    expect((error as ApiError).problem.errors).toEqual([{ field: "username", message: "taken" }]);
  });

  it("survives an error response that is not JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response("<html>", { status: 502 }))),
    );
    const error = await apiFetch("/api/z").catch((e: unknown) => e);
    expect((error as ApiError).status).toBe(502);
  });

  describe("VW-REDIR-007 — a 401 from any request is heard in one place", () => {
    it("notifies listeners on 401", async () => {
      installFakeApi({ "GET /api/rooms": { status: 401 } });
      const listener = vi.fn();
      const off = onUnauthorized(listener);

      await apiFetch("/api/rooms").catch(() => undefined);
      expect(listener).toHaveBeenCalledOnce();

      off();
      await apiFetch("/api/rooms").catch(() => undefined);
      expect(listener).toHaveBeenCalledOnce();
    });

    it("stays quiet when the caller expects a 401 (a wrong password, no session yet)", async () => {
      installFakeApi({ "POST /api/auth/login": { status: 401 } });
      const listener = vi.fn();
      const off = onUnauthorized(listener);

      await apiFetch("/api/auth/login", { method: "POST", expectUnauthorized: true }).catch(
        () => undefined,
      );
      expect(listener).not.toHaveBeenCalled();
      off();
    });

    it("does not treat other errors as an ended session", async () => {
      installFakeApi({ "GET /api/rooms": { status: 403 } });
      const listener = vi.fn();
      const off = onUnauthorized(listener);
      await apiFetch("/api/rooms").catch(() => undefined);
      expect(listener).not.toHaveBeenCalled();
      off();
    });
  });
});

describe("denialMessage (AUD-16)", () => {
  const refused = (status: number, detail?: string, retryAfter?: number) =>
    new ApiError(status, { status, detail }, retryAfter);

  it("keeps the server's own reason for a rule or conflict refusal", () => {
    expect(denialMessage(refused(422, "This room is full."), "x")).toBe("This room is full.");
    expect(denialMessage(refused(409, "Already taken."), "x")).toBe("Already taken.");
  });

  it("states permission, missing, rate-limit and server classes in plain terms", () => {
    expect(denialMessage(refused(403, "Forbidden"), "x")).toBe(
      "You do not have permission to do that.",
    );
    expect(denialMessage(refused(404, "No such room."), "x")).toMatch(/does not exist/);
    expect(denialMessage(refused(429, "Too many", 90), "x")).toBe(
      "Too many requests. Please try again in 2 minutes.",
    );
    expect(denialMessage(refused(503), "x")).toMatch(/temporarily unavailable/);
    expect(denialMessage(refused(500, "NPE"), "x")).toMatch(/our side/);
  });

  it("falls back when a 4xx has no detail, and blames the network for a non-API failure", () => {
    expect(denialMessage(refused(400), "Could not join the room.")).toBe(
      "Could not join the room.",
    );
    expect(denialMessage(new TypeError("fetch failed"), "x")).toMatch(/Could not reach/);
  });
});
