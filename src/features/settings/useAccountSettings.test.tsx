import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { authWrapper, fakeAuth } from "../../test/authWrapper";
import { REGISTERED } from "../../test/fakeApi";
import { completeGoogleLink, fetchAccount } from "./settingsApi";
import { ACCOUNT } from "./settingsTestKit";
import { useAccountSettings } from "./useAccountSettings";

vi.mock("./settingsApi", () => ({ fetchAccount: vi.fn(), completeGoogleLink: vi.fn() }));
const toast = vi.fn();
vi.mock("@astryxdesign/core/Toast", () => ({ useToast: () => toast }));

const render = (path = "/settings") =>
  renderHook(() => useAccountSettings(), { wrapper: authWrapper(fakeAuth(REGISTERED), path) });

beforeEach(() => {
  vi.mocked(fetchAccount).mockReset().mockResolvedValue(ACCOUNT);
  vi.mocked(completeGoogleLink)
    .mockReset()
    .mockResolvedValue({ authMethods: ["PASSWORD", "GOOGLE"] });
  toast.mockReset();
});

describe("useAccountSettings", () => {
  it("loads the account", async () => {
    const { result } = render();
    expect(result.current.account).toBeNull();
    await waitFor(() => {
      expect(result.current.account).toEqual(ACCOUNT);
    });
    expect(result.current.returnedFromGoogle).toBe(false);
  });

  it("reports a failed load, and Retry reads again", async () => {
    vi.mocked(fetchAccount).mockRejectedValueOnce(new Error("down"));
    const { result } = render();
    await waitFor(() => {
      expect(result.current.loadFailed).toBe(true);
    });
    act(() => {
      result.current.retry();
    });
    expect(result.current.loadFailed).toBe(false);
    await waitFor(() => {
      expect(result.current.account).toEqual(ACCOUNT);
    });
  });

  it("replaces the privacy block without touching the rest", async () => {
    const { result } = render();
    await waitFor(() => {
      expect(result.current.account).not.toBeNull();
    });
    act(() => {
      result.current.setPrivacy({ ...ACCOUNT.privacy, profilePrivate: true });
    });
    expect(result.current.account).toEqual({
      ...ACCOUNT,
      privacy: { ...ACCOUNT.privacy, profilePrivate: true },
    });
  });

  it("confirms a Google link the page was sent back from, and re-reads the account", async () => {
    const { result } = render("/settings?linkGoogle=1");
    expect(result.current.returnedFromGoogle).toBe(true);
    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith({ type: "info", body: "Google account linked." });
    });
    expect(completeGoogleLink).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(fetchAccount).toHaveBeenCalledTimes(2);
    });
  });

  it("says so when the link cannot be completed", async () => {
    vi.mocked(completeGoogleLink).mockRejectedValue(new Error("no"));
    render("/settings?linkGoogle=1");
    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith({
        type: "error",
        body: "Could not link your Google account. Please try again.",
      });
    });
  });

  it("explains a Google account that is already linked elsewhere", async () => {
    const { result } = render("/settings?linkError=1");
    expect(result.current.returnedFromGoogle).toBe(true);
    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith({
        type: "error",
        body: "That Google account is already linked to an account.",
      });
    });
    expect(completeGoogleLink).not.toHaveBeenCalled();
  });
});
