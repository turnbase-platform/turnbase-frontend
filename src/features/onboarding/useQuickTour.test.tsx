import { describe, expect, it } from "vitest";
import type { ReactNode } from "react";
import { act, renderHook } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import { TourProvider } from "./TourProvider";
import { TOUR_STEPS } from "./tourSteps";
import { useQuickTour } from "./useQuickTour";
import { useTour } from "./useTour";

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter useTransitions={false}>
      <TourProvider>{children}</TourProvider>
    </MemoryRouter>
  );
}

function setup() {
  return renderHook(() => ({ quick: useQuickTour(), tour: useTour(), at: useLocation() }), {
    wrapper: Wrapper,
  });
}

describe("useQuickTour", () => {
  it("has five steps and starts on the first, closed", () => {
    const { result } = setup();
    expect(TOUR_STEPS.map((s) => s.label)).toEqual(["Hello", "Play", "Rooms", "Friends", "Build"]);
    expect(result.current.quick.step).toBe(0);
    expect(result.current.quick.isOpen).toBe(false);
  });

  it("moves forward and back, remembering which way it came", () => {
    const { result } = setup();
    act(() => {
      result.current.quick.next();
    });
    expect(result.current.quick).toMatchObject({ step: 1, direction: "fwd" });
    act(() => {
      result.current.quick.back();
    });
    expect(result.current.quick).toMatchObject({ step: 0, direction: "back" });
  });

  it("never leaves the first and last steps", () => {
    const { result } = setup();
    act(() => {
      result.current.quick.back();
    });
    expect(result.current.quick.step).toBe(0);
    act(() => {
      result.current.quick.goTo(99);
    });
    expect(result.current.quick).toMatchObject({ step: 4, isLast: true });
  });

  it("closing rewinds, so a replay starts from the top", () => {
    const { result } = setup();
    act(() => {
      result.current.tour.open();
      result.current.quick.goTo(3);
    });
    expect(result.current.quick.isOpen).toBe(true);
    act(() => {
      result.current.quick.close();
    });
    expect(result.current.quick).toMatchObject({ isOpen: false, step: 0 });
  });

  it("finishing closes the tour and goes to the catalog", () => {
    const { result } = setup();
    act(() => {
      result.current.tour.open();
      result.current.quick.goTo(4);
    });
    act(() => {
      result.current.quick.finish();
    });
    expect(result.current.quick.isOpen).toBe(false);
    expect(result.current.at.pathname).toBe("/games");
  });
});
