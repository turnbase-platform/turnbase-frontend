import { useState } from "react";
import { useNavigate } from "react-router";
import { TOUR_STEPS, type TourStep } from "./tourSteps";
import { useTour } from "./useTour";

export interface QuickTour {
  isOpen: boolean;
  steps: readonly TourStep[];
  step: number;
  /** Which way the pane slides in: the way the reader just moved. */
  direction: "fwd" | "back";
  isLast: boolean;
  goTo: (step: number) => void;
  next: () => void;
  back: () => void;
  close: () => void;
  /** The last pane's button: close the tour and pick a game. */
  finish: () => void;
}

/** The quick tour's state: which pane, which way it came, and how it ends. */
export function useQuickTour(): QuickTour {
  const tour = useTour();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"fwd" | "back">("fwd");
  const last = TOUR_STEPS.length - 1;

  function goTo(target: number) {
    const clamped = Math.min(Math.max(target, 0), last);
    setDirection(clamped >= step ? "fwd" : "back");
    setStep(clamped);
  }

  function close() {
    tour.close();
    setStep(0);
    setDirection("fwd");
  }

  return {
    isOpen: tour.isOpen,
    steps: TOUR_STEPS,
    step,
    direction,
    isLast: step === last,
    goTo,
    next: () => {
      goTo(step + 1);
    },
    back: () => {
      goTo(step - 1);
    },
    close,
    finish: () => {
      close();
      void navigate("/games");
    },
  };
}
