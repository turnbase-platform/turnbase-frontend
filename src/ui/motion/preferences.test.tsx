import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import {
  CURSOR_EFFECTS_KEY,
  REDUCE_MOTION_KEY,
  applyMotionAttributes,
  readMotionPreferences,
  useMotionPreferences,
} from "./preferences";
import { prefersReducedMotion, useReducedMotion } from "./motion";

const root = document.documentElement;

beforeEach(() => {
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
});
afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
  root.removeAttribute("data-reduce-motion");
  root.removeAttribute("data-cursor-effects");
});

describe("readMotionPreferences", () => {
  it("defaults to cursor effects on and following the system for motion", () => {
    expect(readMotionPreferences()).toEqual({ cursorEffects: true, reduceMotion: false });
  });

  it("reads what was stored and ignores anything else", () => {
    localStorage.setItem(CURSOR_EFFECTS_KEY, "off");
    localStorage.setItem(REDUCE_MOTION_KEY, "on");
    expect(readMotionPreferences()).toEqual({ cursorEffects: false, reduceMotion: true });
    localStorage.setItem(CURSOR_EFFECTS_KEY, "garbage");
    localStorage.setItem(REDUCE_MOTION_KEY, "garbage");
    expect(readMotionPreferences()).toEqual({ cursorEffects: true, reduceMotion: false });
  });

  it("falls back to the defaults when storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(readMotionPreferences()).toEqual({ cursorEffects: true, reduceMotion: false });
    vi.restoreAllMocks();
  });
});

describe("useMotionPreferences", () => {
  it("persists a change locally, updates the root and tells every subscriber", () => {
    const a = renderHook(() => useMotionPreferences());
    const b = renderHook(() => useMotionPreferences());
    act(() => {
      a.result.current.setCursorEffects(false);
      a.result.current.setReduceMotion(true);
    });
    expect(localStorage.getItem(CURSOR_EFFECTS_KEY)).toBe("off");
    expect(localStorage.getItem(REDUCE_MOTION_KEY)).toBe("on");
    expect(b.result.current.cursorEffects).toBe(false);
    expect(b.result.current.reduceMotion).toBe(true);
    expect(root.getAttribute("data-cursor-effects")).toBe("off");
    expect(root.getAttribute("data-reduce-motion")).toBe("true");
  });

  it("follows another tab's change", () => {
    const { result } = renderHook(() => useMotionPreferences());
    act(() => {
      localStorage.setItem(REDUCE_MOTION_KEY, "on");
      window.dispatchEvent(new StorageEvent("storage", { key: REDUCE_MOTION_KEY }));
    });
    expect(result.current.reduceMotion).toBe(true);
  });

  it("keeps the choice for this visit when the store refuses the write", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    const { result } = renderHook(() => useMotionPreferences());
    act(() => {
      result.current.setCursorEffects(false);
    });
    expect(result.current.cursorEffects).toBe(false);
    vi.restoreAllMocks();
    act(() => {
      result.current.setCursorEffects(true); // a write that lands again ends the in-memory choice
    });
    expect(localStorage.getItem(CURSOR_EFFECTS_KEY)).toBe("on");
  });
});

describe("applyMotionAttributes", () => {
  it("marks the root only for what differs from the default", () => {
    applyMotionAttributes({ cursorEffects: true, reduceMotion: false });
    expect(root.hasAttribute("data-cursor-effects")).toBe(false);
    expect(root.hasAttribute("data-reduce-motion")).toBe(false);
    applyMotionAttributes({ cursorEffects: false, reduceMotion: true });
    expect(root.getAttribute("data-cursor-effects")).toBe("off");
    expect(root.getAttribute("data-reduce-motion")).toBe("true");
    applyMotionAttributes({ cursorEffects: true, reduceMotion: false });
    expect(root.hasAttribute("data-cursor-effects")).toBe(false);
  });
});

describe("the Reduced-motion setting joins the operating system's", () => {
  it("makes prefersReducedMotion true with no OS preference", () => {
    expect(prefersReducedMotion()).toBe(false);
    localStorage.setItem(REDUCE_MOTION_KEY, "on");
    expect(prefersReducedMotion()).toBe(true);
  });

  it("is followed live by useReducedMotion", () => {
    const motion = renderHook(() => useReducedMotion());
    const prefs = renderHook(() => useMotionPreferences());
    expect(motion.result.current).toBe(false);
    act(() => {
      prefs.result.current.setReduceMotion(true);
    });
    expect(motion.result.current).toBe(true);
  });
});
