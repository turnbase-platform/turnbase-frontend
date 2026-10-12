import { createContext } from "react";

export interface Tour {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

export const NONE: Tour = {
  isOpen: false,
  open: () => undefined,
  close: () => undefined,
};

export const TourContext = createContext<Tour>(NONE);
