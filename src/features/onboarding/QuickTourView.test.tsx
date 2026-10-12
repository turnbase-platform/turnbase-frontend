import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuickTourView } from "./QuickTourView";
import { TOUR_STEPS } from "./tourSteps";
import type { QuickTour } from "./useQuickTour";

afterEach(cleanup);

function tour(over: Partial<QuickTour> = {}): QuickTour {
  return {
    isOpen: true,
    steps: TOUR_STEPS,
    step: 0,
    direction: "fwd",
    isLast: false,
    goTo: vi.fn(),
    next: vi.fn(),
    back: vi.fn(),
    close: vi.fn(),
    finish: vi.fn(),
    ...over,
  };
}

describe("QuickTourView", () => {
  it("shows the first pane with Next and Skip, and no Back", () => {
    render(<QuickTourView tour={tour()} />);
    expect(screen.getByText("Step 1 of 5")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Welcome to TurnBase" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Skip tour" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
  });

  it("names the five steps in the stepper", () => {
    render(<QuickTourView tour={tour()} />);
    const steps = screen.getByRole("list", { name: "Tour steps" });
    for (const label of ["Hello", "Play", "Rooms", "Friends", "Build"]) {
      expect(steps).toHaveTextContent(label);
    }
  });

  it("wires Next, Back, Skip and a step click", async () => {
    const t = tour({ step: 2 });
    render(<QuickTourView tour={t} />);
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    await userEvent.click(screen.getByRole("button", { name: "Back" }));
    await userEvent.click(screen.getByRole("button", { name: "Skip tour" }));
    await userEvent.click(screen.getByRole("button", { name: /Hello/ }));
    expect(t.next).toHaveBeenCalledOnce();
    expect(t.back).toHaveBeenCalledOnce();
    expect(t.close).toHaveBeenCalledOnce();
    expect(t.goTo).toHaveBeenCalledWith(0);
  });

  it("ends on 'Pick a game' in place of Next", async () => {
    const t = tour({ step: 4, isLast: true });
    render(<QuickTourView tour={t} />);
    expect(screen.queryByRole("button", { name: "Next" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Pick a game" }));
    expect(t.finish).toHaveBeenCalledOnce();
  });

  it("promises nothing the platform lacks: no presence, no live counts", () => {
    for (const step of TOUR_STEPS) {
      const text = [step.body, ...step.points].join(" ").toLowerCase();
      expect(text).not.toMatch(/online|last seen|playing now|live/);
    }
  });

  it("puts nothing in the document while closed", () => {
    render(<QuickTourView tour={tour({ isOpen: false })} />);
    expect(screen.queryByText("Welcome to TurnBase")).toBeNull();
    expect(document.body.textContent).toBe("");
  });
});
