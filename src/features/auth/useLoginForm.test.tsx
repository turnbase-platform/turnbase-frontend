import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { SubmitEvent } from "react";
import { ApiError } from "../../shared/api";
import { installFakeApi } from "../../test/fakeApi";
import { authWrapper, fakeAuth } from "../../test/authWrapper";
import { useLoginForm } from "./useLoginForm";

const submitEvent = { preventDefault: vi.fn() } as unknown as SubmitEvent<HTMLFormElement>;

beforeEach(() => {
  installFakeApi({ "GET /api/auth/providers": { body: { google: true } } });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("useLoginForm (VW-LOGIN-001…004)", () => {
  it("submits what was typed and stays busy until the guard navigates away", () => {
    const auth = fakeAuth();
    const { result } = renderHook(() => useLoginForm(), { wrapper: authWrapper(auth) });
    act(() => {
      result.current.setUsernameOrEmail("alice");
      result.current.setPassword("secret");
    });
    act(() => {
      result.current.submit(submitEvent);
    });
    expect(auth.login).toHaveBeenCalledWith({ usernameOrEmail: "alice", password: "secret" });
    expect(result.current.isBusy).toBe(true);
  });

  it("keeps the failure and frees the form again", async () => {
    const failure = new ApiError(401, { status: 401 });
    const auth = fakeAuth(null, { login: vi.fn(() => Promise.reject(failure)) });
    const { result } = renderHook(() => useLoginForm(), { wrapper: authWrapper(auth) });
    act(() => {
      result.current.submit(submitEvent);
    });
    await waitFor(() => {
      expect(result.current.error).toBe(failure);
    });
    expect(result.current.isBusy).toBe(false);
  });

  it("reads the redirect and the OAuth failure flag from the address", () => {
    const { result } = renderHook(() => useLoginForm(), {
      wrapper: authWrapper(fakeAuth(), "/login?redirect=%2Frooms%2Fx&oauthError=1"),
    });
    expect(result.current.redirect).toBe("/rooms/x");
    expect(result.current.oauthFailed).toBe(true);
  });

  it("learns whether Google sign-in is offered", async () => {
    const { result } = renderHook(() => useLoginForm(), { wrapper: authWrapper(fakeAuth()) });
    expect(result.current.google).toBe(false);
    await waitFor(() => {
      expect(result.current.google).toBe(true);
    });
  });
});
