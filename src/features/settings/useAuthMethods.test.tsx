import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { ApiError } from "../../shared/api";
import { useGoogleAvailable } from "../auth/useGoogleAvailable";
import { removeAuthMethod } from "./settingsApi";
import type { AccountResponse } from "./settings-types";
import { ACCOUNT } from "./settingsTestKit";
import { useAuthMethods } from "./useAuthMethods";

vi.mock("./settingsApi", () => ({ removeAuthMethod: vi.fn() }));
vi.mock("../auth/useGoogleAvailable", () => ({ useGoogleAvailable: vi.fn() }));
const toast = vi.fn();
vi.mock("@astryxdesign/core/Toast", () => ({ useToast: () => toast }));

const both: AccountResponse = { ...ACCOUNT, authMethods: ["PASSWORD", "GOOGLE"] };
const render = (account = ACCOUNT, onReload = vi.fn()) =>
  renderHook(() => useAuthMethods(account, onReload));

beforeEach(() => {
  vi.mocked(removeAuthMethod).mockReset().mockResolvedValue(undefined);
  vi.mocked(useGoogleAvailable).mockReturnValue(true);
  toast.mockReset();
});

describe("useAuthMethods", () => {
  it("offers Remove only with more than one method", () => {
    expect(render().result.current.canRemove).toBe(false);
    expect(render(both).result.current.canRemove).toBe(true);
  });

  it("offers Google only when the deployment has it and it is not linked", () => {
    expect(render().result.current.canLinkGoogle).toBe(true);
    expect(render(both).result.current.canLinkGoogle).toBe(false);
    vi.mocked(useGoogleAvailable).mockReturnValue(false);
    expect(render().result.current.canLinkGoogle).toBe(false);
  });

  it("removes a method and reloads the account", async () => {
    const onReload = vi.fn();
    const { result } = render(both, onReload);
    act(() => {
      result.current.remove("GOOGLE");
    });
    await waitFor(() => {
      expect(onReload).toHaveBeenCalled();
    });
    expect(removeAuthMethod).toHaveBeenCalledWith("GOOGLE");
    expect(toast).toHaveBeenCalledWith({ type: "info", body: "Sign-in method removed." });
  });

  it.each([
    [422, "You cannot remove your only sign-in method."],
    [500, "Could not remove that sign-in method. Please try again."],
  ])("explains a %i", async (status, body) => {
    vi.mocked(removeAuthMethod).mockRejectedValue(
      new ApiError(status, { type: "about:blank", title: "x", status }),
    );
    const { result } = render(both);
    act(() => {
      result.current.remove("PASSWORD");
    });
    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith({ type: "error", body });
    });
    expect(result.current.isBusy).toBe(false);
  });
});
