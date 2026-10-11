import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { ApiError } from "../../shared/api";
import { authWrapper, fakeAuth } from "../../test/authWrapper";
import { REGISTERED } from "../../test/fakeApi";
import { deleteAccount } from "./settingsApi";
import { useDeleteAccount } from "./useDeleteAccount";

vi.mock("./settingsApi", () => ({ deleteAccount: vi.fn() }));
const navigate = vi.fn();
vi.mock("react-router", async (original) => ({
  ...(await original<typeof import("react-router")>()),
  useNavigate: () => navigate,
}));
const toast = vi.fn();
vi.mock("@astryxdesign/core/Toast", () => ({ useToast: () => toast }));

const auth = fakeAuth(REGISTERED);
const render = (needsPassword: boolean) =>
  renderHook(() => useDeleteAccount(needsPassword), { wrapper: authWrapper(auth) });

beforeEach(() => {
  vi.mocked(deleteAccount).mockReset().mockResolvedValue(undefined);
  navigate.mockReset();
  toast.mockReset();
  vi.mocked(auth.logout).mockClear();
});

describe("useDeleteAccount", () => {
  it("opening the dialog deletes nothing", () => {
    const { result } = render(true);
    act(() => {
      result.current.setIsOpen(true);
    });
    expect(result.current.isOpen).toBe(true);
    expect(deleteAccount).not.toHaveBeenCalled();
  });

  it("confirming sends the password, goes home and signs out", async () => {
    const { result } = render(true);
    act(() => {
      result.current.setPassword("pw-123");
    });
    act(() => {
      result.current.confirm();
    });
    await waitFor(() => {
      expect(auth.logout).toHaveBeenCalled();
    });
    expect(deleteAccount).toHaveBeenCalledWith("pw-123");
    expect(navigate).toHaveBeenCalledWith("/", { replace: true });
  });

  it("sends no password for an account that has none", async () => {
    const { result } = render(false);
    act(() => {
      result.current.confirm();
    });
    await waitFor(() => {
      expect(deleteAccount).toHaveBeenCalledWith(undefined);
    });
  });

  it.each([
    [422, "That password is incorrect."],
    [500, "Could not delete your account. Please try again."],
  ])("explains a %i and closes the dialog", async (status, body) => {
    vi.mocked(deleteAccount).mockRejectedValue(
      new ApiError(status, { type: "about:blank", title: "x", status }),
    );
    const { result } = render(true);
    act(() => {
      result.current.setIsOpen(true);
    });
    act(() => {
      result.current.confirm();
    });
    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith({ type: "error", body });
    });
    expect(result.current.isOpen).toBe(false);
    expect(result.current.isBusy).toBe(false);
    expect(auth.logout).not.toHaveBeenCalled();
  });
});
