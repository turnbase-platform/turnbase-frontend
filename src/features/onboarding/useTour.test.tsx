import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { TourProvider } from "./TourProvider";
import { useTour } from "./useTour";

describe("useTour", () => {
  it("opens and closes through the provider", () => {
    const { result } = renderHook(() => useTour(), { wrapper: TourProvider });
    expect(result.current.isOpen).toBe(false);
    act(() => {
      result.current.open();
    });
    expect(result.current.isOpen).toBe(true);
    act(() => {
      result.current.close();
    });
    expect(result.current.isOpen).toBe(false);
  });

  it("is inert without a provider, so a view can be rendered alone", () => {
    const { result } = renderHook(() => useTour());
    act(() => {
      result.current.open();
    });
    expect(result.current.isOpen).toBe(false);
  });
});
