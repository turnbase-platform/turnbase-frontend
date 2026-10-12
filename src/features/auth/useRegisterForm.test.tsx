import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import type { SubmitEvent } from "react";
import { installFakeApi } from "../../test/fakeApi";
import { authWrapper, fakeAuth } from "../../test/authWrapper";
import { TourProvider } from "../onboarding/TourProvider";
import { useTour } from "../onboarding/useTour";
import { useRegisterForm } from "./useRegisterForm";

const submitEvent = { preventDefault: vi.fn() } as unknown as SubmitEvent<HTMLFormElement>;

beforeEach(() => {
  installFakeApi({ "GET /api/auth/providers": { body: { google: false } } });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function fill(result: { current: ReturnType<typeof useRegisterForm> }, confirm: string) {
  act(() => {
    result.current.setUsername("alice");
    result.current.setEmail("alice@example.com");
    result.current.setPassword("Secret-pass-1");
    result.current.setConfirmPassword(confirm);
  });
}

describe("useRegisterForm (VW-REG-001…003)", () => {
  it("submits the four fields", () => {
    const auth = fakeAuth();
    const { result } = renderHook(() => useRegisterForm(), { wrapper: authWrapper(auth) });
    fill(result, "Secret-pass-1");
    act(() => {
      result.current.submit(submitEvent);
    });
    expect(auth.register).toHaveBeenCalledWith({
      username: "alice",
      email: "alice@example.com",
      password: "Secret-pass-1",
      confirmPassword: "Secret-pass-1",
    });
  });

  it("opens the quick tour once the account exists, and not before", async () => {
    const Auth = authWrapper(fakeAuth());
    const { result } = renderHook(() => ({ form: useRegisterForm(), tour: useTour() }), {
      wrapper: ({ children }) => (
        <Auth>
          <TourProvider>{children}</TourProvider>
        </Auth>
      ),
    });
    fill(
      {
        get current() {
          return result.current.form;
        },
      },
      "Secret-pass-1",
    );
    expect(result.current.tour.isOpen).toBe(false);
    await act(async () => {
      result.current.form.submit(submitEvent);
      await Promise.resolve();
    });
    expect(result.current.tour.isOpen).toBe(true);
  });

  it("does not open the tour when registration fails", async () => {
    const Auth = authWrapper(
      fakeAuth(null, { register: vi.fn(() => Promise.reject(new Error("taken"))) }),
    );
    const { result } = renderHook(() => ({ form: useRegisterForm(), tour: useTour() }), {
      wrapper: ({ children }) => (
        <Auth>
          <TourProvider>{children}</TourProvider>
        </Auth>
      ),
    });
    fill(
      {
        get current() {
          return result.current.form;
        },
      },
      "Secret-pass-1",
    );
    await act(async () => {
      result.current.form.submit(submitEvent);
      await Promise.resolve();
    });
    expect(result.current.tour.isOpen).toBe(false);
    expect(result.current.form.error).toBeInstanceOf(Error);
  });

  it("a mismatch is reported on the field and blocks the request", () => {
    const auth = fakeAuth();
    const { result } = renderHook(() => useRegisterForm(), { wrapper: authWrapper(auth) });
    fill(result, "different");
    expect(result.current.mismatch).toEqual({ type: "error", message: "Passwords do not match." });
    act(() => {
      result.current.submit(submitEvent);
    });
    expect(auth.register).not.toHaveBeenCalled();
    expect(result.current.isBusy).toBe(false);
  });

  it("an empty confirmation is not yet a mismatch", () => {
    const { result } = renderHook(() => useRegisterForm(), {
      wrapper: authWrapper(fakeAuth()),
    });
    expect(result.current.mismatch).toBeUndefined();
  });
});
