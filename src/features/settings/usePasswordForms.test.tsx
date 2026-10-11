import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { SubmitEvent } from "react";
import { addPasswordMethod, changePassword } from "./settingsApi";
import { useAddPassword, useChangePassword } from "./usePasswordForms";

vi.mock("./settingsApi", () => ({ addPasswordMethod: vi.fn(), changePassword: vi.fn() }));
const toast = vi.fn();
vi.mock("@astryxdesign/core/Toast", () => ({ useToast: () => toast }));

const submitEvent = { preventDefault: vi.fn() } as unknown as SubmitEvent<HTMLFormElement>;

beforeEach(() => {
  vi.mocked(changePassword).mockReset().mockResolvedValue(undefined);
  vi.mocked(addPasswordMethod).mockReset().mockResolvedValue(undefined);
  toast.mockReset();
});

describe("useChangePassword", () => {
  it("does not submit while the confirmation differs", () => {
    const { result } = renderHook(() => useChangePassword());
    act(() => {
      result.current.setNewPassword("one");
      result.current.setConfirmNewPassword("two");
    });
    expect(result.current.mismatch).toEqual({ type: "error", message: "Passwords do not match." });
    act(() => {
      result.current.submit(submitEvent);
    });
    expect(changePassword).not.toHaveBeenCalled();
  });

  it("changes the password and clears the form", async () => {
    const { result } = renderHook(() => useChangePassword());
    act(() => {
      result.current.setCurrentPassword("old");
      result.current.setNewPassword("new-pass");
      result.current.setConfirmNewPassword("new-pass");
    });
    expect(result.current.mismatch).toBeUndefined();
    act(() => {
      result.current.submit(submitEvent);
    });
    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith({ type: "info", body: "Password changed." });
    });
    expect(changePassword).toHaveBeenCalledWith({
      currentPassword: "old",
      newPassword: "new-pass",
      confirmNewPassword: "new-pass",
    });
    expect(result.current.currentPassword).toBe("");
    expect(result.current.newPassword).toBe("");
  });

  it("keeps what was typed when the server refuses", async () => {
    const failure = new Error("no");
    vi.mocked(changePassword).mockRejectedValue(failure);
    const { result } = renderHook(() => useChangePassword());
    act(() => {
      result.current.setCurrentPassword("old");
    });
    act(() => {
      result.current.submit(submitEvent);
    });
    await waitFor(() => {
      expect(result.current.error).toBe(failure);
    });
    expect(result.current.currentPassword).toBe("old");
    expect(toast).not.toHaveBeenCalled();
  });
});

describe("useAddPassword", () => {
  it("adds the method and tells the page to reload the account", async () => {
    const onAdded = vi.fn();
    const { result } = renderHook(() => useAddPassword(onAdded));
    act(() => {
      result.current.setPassword("pw-12345");
      result.current.setConfirmPassword("pw-12345");
    });
    act(() => {
      result.current.submit(submitEvent);
    });
    await waitFor(() => {
      expect(onAdded).toHaveBeenCalled();
    });
    expect(addPasswordMethod).toHaveBeenCalledWith("pw-12345", "pw-12345");
    expect(toast).toHaveBeenCalledWith({ type: "info", body: "Password sign-in added." });
  });

  it("does not submit while the confirmation differs", () => {
    const { result } = renderHook(() => useAddPassword(vi.fn()));
    act(() => {
      result.current.setPassword("a");
      result.current.setConfirmPassword("b");
    });
    act(() => {
      result.current.submit(submitEvent);
    });
    expect(addPasswordMethod).not.toHaveBeenCalled();
  });
});
