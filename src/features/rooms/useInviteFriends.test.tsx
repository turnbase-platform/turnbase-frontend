import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { ApiError } from "../../shared/api";
import { authWrapper, fakeAuth } from "../../test/authWrapper";
import { GUEST, REGISTERED } from "../../test/fakeApi";
import { fetchFriends } from "../friends/friendsApi";
import { inviteFriend } from "./roomsApi";
import { useInviteFriends } from "./useInviteFriends";

vi.mock("./roomsApi", () => ({ inviteFriend: vi.fn() }));
vi.mock("../friends/friendsApi", () => ({ fetchFriends: vi.fn() }));

const toast = vi.fn();
vi.mock("@astryxdesign/core/Toast", () => ({ useToast: () => toast }));

const friend = (username: string) => ({ userId: `id-${username}`, username });
const page = (...names: string[]) =>
  ({ content: names.map(friend) }) as Awaited<ReturnType<typeof fetchFriends>>;

const wrapper = authWrapper(fakeAuth(REGISTERED));

beforeEach(() => {
  vi.mocked(fetchFriends).mockReset().mockResolvedValue(page("bob", "carol"));
  vi.mocked(inviteFriend)
    .mockReset()
    .mockResolvedValue(undefined as never);
  toast.mockReset();
});

async function opened() {
  const hook = renderHook(() => useInviteFriends("r-1"), { wrapper });
  act(() => {
    hook.result.current.open();
  });
  await waitFor(() => {
    expect(hook.result.current.friends.status).toBe("ready");
  });
  return hook;
}

describe("useInviteFriends", () => {
  it("VW-RLOBBY-005: is unavailable to a Guest, who cannot have friends", () => {
    const { result } = renderHook(() => useInviteFriends("r-1"), {
      wrapper: authWrapper(fakeAuth(GUEST)),
    });
    expect(result.current.available).toBe(false);
  });

  it("loads the host's friends when opened", async () => {
    const { result } = await opened();
    expect(result.current.available).toBe(true);
    expect(result.current.isOpen).toBe(true);
    expect(fetchFriends).toHaveBeenCalledWith("alice");
  });

  it("reports a friend list that could not be loaded", async () => {
    vi.mocked(fetchFriends).mockRejectedValue(new Error("down"));
    const { result } = renderHook(() => useInviteFriends("r-1"), { wrapper });
    act(() => {
      result.current.open();
    });
    await waitFor(() => {
      expect(result.current.friends.status).toBe("error");
    });
  });

  it("sends one invitation per selected friend and closes when all land", async () => {
    const { result } = await opened();
    act(() => {
      result.current.setSelected(["bob", "carol"]);
    });
    act(() => {
      result.current.send();
    });
    await waitFor(() => {
      expect(result.current.isOpen).toBe(false);
    });
    expect(inviteFriend).toHaveBeenCalledWith("r-1", "bob");
    expect(inviteFriend).toHaveBeenCalledWith("r-1", "carol");
    expect(toast).toHaveBeenCalledWith({ type: "info", body: "Invitation sent to bob, carol." });
  });

  it.each([
    [403, "carol: only the host can invite players."],
    [404, "carol: this room is closed, or the user no longer exists."],
    [422, "carol: you can only invite friends."],
    [500, "carol: the invitation could not be sent."],
  ])("a %i keeps the friend selected and says why", async (status, message) => {
    vi.mocked(inviteFriend).mockImplementation((_room, name) =>
      name === "carol"
        ? Promise.reject(new ApiError(status, { status }))
        : Promise.resolve(undefined as never),
    );
    const { result } = await opened();
    act(() => {
      result.current.setSelected(["bob", "carol"]);
    });
    act(() => {
      result.current.send();
    });
    await waitFor(() => {
      expect(result.current.failures).toEqual([message]);
    });
    expect(result.current.selected).toEqual(["carol"]);
    expect(result.current.isOpen).toBe(true);
    expect(toast).toHaveBeenCalledWith({ type: "info", body: "Invitation sent to bob." });
  });
});
