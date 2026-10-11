import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { prefersReducedMotion, useReducedMotion } from "./motion";

function stubQuery(matches: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("prefersReducedMotion", () => {
  it("is false when the visitor expressed no preference", () => {
    stubQuery(false);
    expect(prefersReducedMotion()).toBe(false);
  });

  it("is true under prefers-reduced-motion: reduce", () => {
    stubQuery(true);
    expect(prefersReducedMotion()).toBe(true);
  });

  it("asks the right question", () => {
    const seen: string[] = [];
    vi.stubGlobal("matchMedia", (query: string) => {
      seen.push(query);
      return { matches: false };
    });
    prefersReducedMotion();
    expect(seen).toEqual(["(prefers-reduced-motion: reduce)"]);
  });
});

describe("useReducedMotion", () => {
  it("reports the current preference", () => {
    stubQuery(true);
    expect(renderHook(() => useReducedMotion()).result.current).toBe(true);
  });

  it("follows a change of preference while mounted", () => {
    let listener: (() => void) | undefined;
    let matches = false;
    vi.stubGlobal("matchMedia", () => ({
      get matches() {
        return matches;
      },
      addEventListener: (_: string, l: () => void) => {
        listener = l;
      },
      removeEventListener: () => undefined,
    }));
    const { result, rerender } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
    matches = true;
    listener?.();
    rerender();
    expect(result.current).toBe(true);
  });
});
