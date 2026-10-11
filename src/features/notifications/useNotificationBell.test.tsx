import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { authWrapper, fakeAuth } from "../../test/authWrapper";
import { REGISTERED } from "../../test/fakeApi";
import { apiFetch } from "../../shared/api";
import { openNotificationStream } from "./notificationStream";
import { useNotificationBell } from "./useNotificationBell";

vi.mock("../../shared/api", async (original) => ({
  ...(await original<typeof import("../../shared/api")>()),
  apiFetch: vi.fn(),
}));
vi.mock("./notificationStream", () => ({ openNotificationStream: vi.fn() }));
const signalFriendChange = vi.fn();
vi.mock("./liveSignal", async (original) => ({
  ...(await original<typeof import("./liveSignal")>()),
  signalFriendChange: () => {
    signalFriendChange();
  },
}));
const navigate = vi.fn();
vi.mock("react-router", async (original) => ({
  ...(await original<typeof import("react-router")>()),
  useNavigate: () => navigate,
}));
const toast = vi.fn();
vi.mock("@astryxdesign/core/Toast", () => ({ useToast: () => toast }));

type Handlers = Parameters<typeof openNotificationStream>[0];
let handlers: Handlers;
const close = vi.fn();
const auth = fakeAuth(REGISTERED);
const render = () => renderHook(() => useNotificationBell(), { wrapper: authWrapper(auth) });

beforeEach(() => {
  vi.mocked(apiFetch).mockReset().mockResolvedValue({ unreadCount: 2 });
  vi.mocked(openNotificationStream)
    .mockReset()
    .mockImplementation((given) => {
      handlers = given;
      return close;
    });
  signalFriendChange.mockReset();
  navigate.mockReset();
  toast.mockReset();
  close.mockReset();
});

describe("useNotificationBell", () => {
  it("reads the unread count from the API, not from pushes", async () => {
    const { result } = render();
    await waitFor(() => {
      expect(result.current.unread).toBe(2);
    });
    vi.mocked(apiFetch).mockResolvedValue({ unreadCount: 5 });
    act(() => {
      handlers.onNotification({ type: "ROOM_INVITATION", notificationId: "n-1" });
    });
    await waitFor(() => {
      expect(result.current.unread).toBe(5);
    });
    expect(result.current.reloadKey).toBe(1);
    expect(signalFriendChange).not.toHaveBeenCalled();
  });

  it("signals a friend change for a FRIEND_* push and on every (re)connect", () => {
    const { result } = render();
    act(() => {
      handlers.onNotification({ type: "FRIEND_REQUEST", notificationId: "n-1" });
    });
    expect(signalFriendChange).toHaveBeenCalledTimes(1);
    act(() => {
      handlers.onOpen?.();
    });
    expect(signalFriendChange).toHaveBeenCalledTimes(2);
    expect(result.current.reloadKey).toBe(2);
  });

  it("re-reads the count when the panel opens, not when it closes", async () => {
    const { result } = render();
    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledTimes(1);
    });
    act(() => {
      result.current.setOpen(true);
    });
    expect(result.current.isOpen).toBe(true);
    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledTimes(2);
    });
    act(() => {
      result.current.setOpen(false);
    });
    expect(result.current.isOpen).toBe(false);
    expect(apiFetch).toHaveBeenCalledTimes(2);
  });

  it("keeps the badge when the count cannot be read", async () => {
    vi.mocked(apiFetch).mockRejectedValue(new Error("down"));
    const { result } = render();
    await Promise.resolve();
    expect(result.current.unread).toBe(0);
  });

  it("a terminal alert signs the session out and goes to the login page", () => {
    render();
    act(() => {
      handlers.onAlert({ type: "SESSION_DISPLACED" });
    });
    expect(auth.clearPrincipal).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith("/login");
  });

  it("closes the stream on unmount", () => {
    render().unmount();
    expect(close).toHaveBeenCalled();
  });
});
