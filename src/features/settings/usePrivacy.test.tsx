import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { updatePrivacy } from "./settingsApi";
import { ACCOUNT } from "./settingsTestKit";
import { usePrivacy } from "./usePrivacy";

vi.mock("./settingsApi", () => ({ updatePrivacy: vi.fn() }));
const toast = vi.fn();
vi.mock("@astryxdesign/core/Toast", () => ({ useToast: () => toast }));

const saved = { ...ACCOUNT.privacy, profilePrivate: true };

beforeEach(() => {
  vi.mocked(updatePrivacy).mockReset().mockResolvedValue(saved);
  toast.mockReset();
});

describe("usePrivacy", () => {
  it("saves one change on its own and hands the stored block back", async () => {
    const onUpdated = vi.fn();
    const { result } = renderHook(() => usePrivacy(ACCOUNT.privacy, onUpdated));
    act(() => {
      result.current.save({ profilePrivate: true });
    });
    await waitFor(() => {
      expect(onUpdated).toHaveBeenCalledWith(saved);
    });
    expect(updatePrivacy).toHaveBeenCalledWith({ profilePrivate: true });
    expect(toast).toHaveBeenCalledWith({ type: "info", body: "Privacy settings saved." });
    expect(result.current.isBusy).toBe(false);
  });

  it("says so when a change is refused, and keeps the old block", async () => {
    vi.mocked(updatePrivacy).mockRejectedValue(new Error("no"));
    const onUpdated = vi.fn();
    const { result } = renderHook(() => usePrivacy(ACCOUNT.privacy, onUpdated));
    act(() => {
      result.current.save({ blockFriendRequests: true });
    });
    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith({
        type: "error",
        body: "Could not save that setting. Please try again.",
      });
    });
    expect(onUpdated).not.toHaveBeenCalled();
    expect(result.current.privacy).toBe(ACCOUNT.privacy);
  });
});
