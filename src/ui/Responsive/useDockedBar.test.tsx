import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useDockedBar } from "./useDockedBar";

function stubMatchMedia(matches: boolean) {
  const listeners = new Set<() => void>();
  let current = matches;
  vi.stubGlobal("matchMedia", () => ({
    get matches() {
      return current;
    },
    addEventListener: (_: string, l: () => void) => listeners.add(l),
    removeEventListener: (_: string, l: () => void) => listeners.delete(l),
  }));
  return (next: boolean) => {
    current = next;
    listeners.forEach((l) => {
      l();
    });
  };
}

describe("useDockedBar", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("is true on a phone-width screen and follows the media query", () => {
    const set = stubMatchMedia(true);
    const { result } = renderHook(() => useDockedBar());
    expect(result.current).toBe(true);
    act(() => {
      set(false);
    });
    expect(result.current).toBe(false);
  });
});
