import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { SubmitEvent } from "react";
import { authWrapper, fakeAuth } from "../../test/authWrapper";
import { REGISTERED } from "../../test/fakeApi";
import { fetchAccount, updateAccount } from "./settingsApi";
import { ACCOUNT } from "./settingsTestKit";
import { useIdentityForm, type IdentityField } from "./useIdentityForm";

vi.mock("./settingsApi", () => ({ fetchAccount: vi.fn(), updateAccount: vi.fn() }));
const toast = vi.fn();
vi.mock("@astryxdesign/core/Toast", () => ({ useToast: () => toast }));

const submitEvent = { preventDefault: vi.fn() } as unknown as SubmitEvent<HTMLFormElement>;
const auth = fakeAuth(REGISTERED);
const onUpdated = vi.fn();
const render = (field: IdentityField, account = ACCOUNT) =>
  renderHook(() => useIdentityForm(field, account, onUpdated), { wrapper: authWrapper(auth) });

beforeEach(() => {
  vi.mocked(updateAccount).mockReset().mockResolvedValue({});
  vi.mocked(fetchAccount)
    .mockReset()
    .mockResolvedValue({ ...ACCOUNT, username: "alice2" });
  onUpdated.mockReset();
  toast.mockReset();
  vi.mocked(auth.acceptPrincipal).mockReset();
});

describe("useIdentityForm", () => {
  it("starts on the stored value and asks nothing for an unchanged one", () => {
    const { result } = render("username");
    expect(result.current.value).toBe("alice");
    act(() => {
      result.current.submit(submitEvent);
    });
    expect(updateAccount).not.toHaveBeenCalled();
  });

  it("saves a new username, re-reads the account and tells the session", async () => {
    const { result } = render("username");
    act(() => {
      result.current.setValue("alice2");
    });
    act(() => {
      result.current.submit(submitEvent);
    });
    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith({ type: "info", body: "Username updated." });
    });
    expect(updateAccount).toHaveBeenCalledWith({ username: "alice2" });
    expect(onUpdated).toHaveBeenCalledWith({ ...ACCOUNT, username: "alice2" });
    expect(auth.acceptPrincipal).toHaveBeenCalledWith({ ...REGISTERED, username: "alice2" });
  });

  it("proves the password for an email change on a credential account", async () => {
    const { result } = render("email");
    expect(result.current.needsPassword).toBe(true);
    act(() => {
      result.current.setValue("b@example.com");
      result.current.setConfirmPassword("pw-123");
    });
    act(() => {
      result.current.submit(submitEvent);
    });
    await waitFor(() => {
      expect(updateAccount).toHaveBeenCalledWith({
        email: "b@example.com",
        currentPassword: "pw-123",
      });
    });
    await waitFor(() => {
      expect(result.current.confirmPassword).toBe("");
    });
    expect(auth.acceptPrincipal).not.toHaveBeenCalled();
  });

  it("asks for no password when the account has none", () => {
    expect(
      render("email", { ...ACCOUNT, authMethods: ["GOOGLE"] }).result.current.needsPassword,
    ).toBe(false);
  });

  it("keeps the failure for the field and stops loading", async () => {
    const failure = new Error("bad");
    vi.mocked(updateAccount).mockRejectedValue(failure);
    const { result } = render("username");
    act(() => {
      result.current.setValue("x");
    });
    act(() => {
      result.current.submit(submitEvent);
    });
    await waitFor(() => {
      expect(result.current.error).toBe(failure);
    });
    expect(result.current.isBusy).toBe(false);
    expect(toast).not.toHaveBeenCalled();
  });

  it("reports the lock window of its own field", () => {
    const until = "2026-11-01T00:00:00Z";
    const account = { ...ACCOUNT, emailChangeableAt: until };
    expect(render("username", account).result.current.lockedUntil).toBeNull();
    expect(render("email", account).result.current.lockedUntil).toBe(until);
  });
});
