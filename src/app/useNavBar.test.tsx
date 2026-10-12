import { afterEach, describe, expect, it } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { GUEST, REGISTERED } from "../test/fakeApi";
import { authWrapper, fakeAuth } from "../test/authWrapper";
import { useNavBar } from "./useNavBar";

afterEach(cleanup);

const labels = (items: { label: string }[]) => items.map((i) => i.label);

describe("useNavBar (VW-NAV-001…012)", () => {
  it("Unauth sees the catalog only, and is not signed in", () => {
    const { result } = renderHook(() => useNavBar(), { wrapper: authWrapper(fakeAuth()) });
    expect(labels(result.current.links)).toEqual(["Games"]);
    expect(result.current.isSignedIn).toBe(false);
  });

  it("a Guest gains Rooms but not Friends, and has no Account settings", () => {
    const { result } = renderHook(() => useNavBar(), { wrapper: authWrapper(fakeAuth(GUEST)) });
    expect(labels(result.current.links)).toEqual(["Games", "Rooms"]);
    expect(labels(result.current.menu)).toEqual(["Profile", "Replay the tour", "Leave as guest"]);
    expect(result.current.username).toBe(GUEST.username);
  });

  it("a Registered user sees everything", () => {
    const { result } = renderHook(() => useNavBar(), {
      wrapper: authWrapper(fakeAuth(REGISTERED)),
    });
    expect(labels(result.current.links)).toEqual(["Games", "Rooms", "Friends"]);
    expect(labels(result.current.menu)).toEqual([
      "Profile",
      "Settings",
      "Replay the tour",
      "Sign out",
    ]);
  });

  it("keeps the exit item last and apart from the rest", () => {
    const { result } = renderHook(() => useNavBar(), {
      wrapper: authWrapper(fakeAuth(REGISTERED)),
    });
    expect(result.current.menu.map((m) => m.group)).toEqual(["main", "main", "main", "exit"]);
  });

  it("marks the link of the current section selected", () => {
    const { result } = renderHook(() => useNavBar(), {
      wrapper: authWrapper(fakeAuth(REGISTERED), "/rooms/abc"),
    });
    expect(result.current.links.filter((l) => l.isSelected).map((l) => l.label)).toEqual(["Rooms"]);
  });

  it("Sign out leaves the page first, then ends the session", () => {
    const auth = fakeAuth(REGISTERED);
    const { result } = renderHook(() => useNavBar(), { wrapper: authWrapper(auth, "/rooms") });
    act(() => {
      result.current.menu.find((m) => m.label === "Sign out")?.onSelect();
    });
    expect(auth.logout).toHaveBeenCalledOnce();
  });
});
