import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { AppearanceContext } from "../../app/appearance";
import { useAppearanceSettings } from "./useAppearanceSettings";

const setAppearance = vi.fn();
const wrapper = ({ children }: { children: ReactNode }) => (
  <AppearanceContext.Provider value={{ appearance: "dark", setAppearance }}>
    {children}
  </AppearanceContext.Provider>
);

afterEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-cursor-effects");
  document.documentElement.removeAttribute("data-reduce-motion");
  setAppearance.mockReset();
});

describe("useAppearanceSettings", () => {
  it("combines the theme with the two motion choices", () => {
    const { result } = renderHook(() => useAppearanceSettings(), { wrapper });
    expect(result.current).toMatchObject({
      appearance: "dark",
      cursorEffects: true,
      reduceMotion: false,
    });
  });

  it("hands the theme to the provider", () => {
    const { result } = renderHook(() => useAppearanceSettings(), { wrapper });
    result.current.setAppearance("light");
    expect(setAppearance).toHaveBeenCalledWith("light");
  });

  it("stores the motion choices in the browser and marks the page", () => {
    const { result } = renderHook(() => useAppearanceSettings(), { wrapper });
    act(() => {
      result.current.setCursorEffects(false);
      result.current.setReduceMotion(true);
    });
    expect(result.current).toMatchObject({ cursorEffects: false, reduceMotion: true });
    expect(localStorage.getItem("turnbase.cursorEffects")).toBe("off");
    expect(localStorage.getItem("turnbase.reduceMotion")).toBe("on");
    expect(document.documentElement.getAttribute("data-cursor-effects")).toBe("off");
    expect(document.documentElement.getAttribute("data-reduce-motion")).toBe("true");
  });
});
