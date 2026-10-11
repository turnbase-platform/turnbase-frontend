import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { SubmitEvent } from "react";
import { REGISTERED, installFakeApi } from "../../test/fakeApi";
import { authWrapper, fakeAuth } from "../../test/authWrapper";
import { useOAuthCompletion } from "./useOAuthCompletion";

const submitEvent = { preventDefault: vi.fn() } as unknown as SubmitEvent<HTMLFormElement>;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("useOAuthCompletion (VW-OAUTHCOMP-001…002)", () => {
  it("shows the pending email once the server has it", async () => {
    installFakeApi({ "GET /api/auth/oauth/pending": { body: { email: "a@example.com" } } });
    const { result } = renderHook(() => useOAuthCompletion(), {
      wrapper: authWrapper(fakeAuth()),
    });
    expect(result.current.pending.state).toBe("loading");
    await waitFor(() => {
      expect(result.current.pending.state).toBe("ready");
    });
    expect(result.current.email).toBe("a@example.com");
  });

  it("no pending registration means there is nothing to complete", async () => {
    installFakeApi({ "GET /api/auth/oauth/pending": { status: 404, body: { status: 404 } } });
    const { result } = renderHook(() => useOAuthCompletion(), {
      wrapper: authWrapper(fakeAuth()),
    });
    await waitFor(() => {
      expect(result.current.pending.state).toBe("missing");
    });
  });

  it("completing the registration accepts the principal it returns", async () => {
    installFakeApi({
      "GET /api/auth/oauth/pending": { body: { email: "a@example.com" } },
      "POST /api/auth/oauth/complete-registration": { status: 201, body: REGISTERED },
    });
    const auth = fakeAuth();
    const { result } = renderHook(() => useOAuthCompletion(), { wrapper: authWrapper(auth) });
    await waitFor(() => {
      expect(result.current.pending.state).toBe("ready");
    });
    act(() => {
      result.current.setUsername("alice");
    });
    act(() => {
      result.current.submit(submitEvent);
    });
    await waitFor(() => {
      expect(auth.acceptPrincipal).toHaveBeenCalledWith(REGISTERED);
    });
  });

  it("an email that already has an account is a collision, not an error", async () => {
    installFakeApi({
      "GET /api/auth/oauth/pending": { body: { email: "a@example.com" } },
      "POST /api/auth/oauth/complete-registration": { body: { outcome: "CHALLENGE_REQUIRED" } },
    });
    const { result } = renderHook(() => useOAuthCompletion(), {
      wrapper: authWrapper(fakeAuth()),
    });
    await waitFor(() => {
      expect(result.current.pending.state).toBe("ready");
    });
    act(() => {
      result.current.submit(submitEvent);
    });
    await waitFor(() => {
      expect(result.current.collision).toBe(true);
    });
    expect(result.current.error).toBeNull();
    expect(result.current.isBusy).toBe(false);
  });

  it("a pending record that expired mid-form sends the visitor away", async () => {
    installFakeApi({
      "GET /api/auth/oauth/pending": { body: { email: "a@example.com" } },
      "POST /api/auth/oauth/complete-registration": { status: 404, body: { status: 404 } },
    });
    const { result } = renderHook(() => useOAuthCompletion(), {
      wrapper: authWrapper(fakeAuth()),
    });
    await waitFor(() => {
      expect(result.current.pending.state).toBe("ready");
    });
    act(() => {
      result.current.submit(submitEvent);
    });
    await waitFor(() => {
      expect(result.current.pending.state).toBe("missing");
    });
  });
});
