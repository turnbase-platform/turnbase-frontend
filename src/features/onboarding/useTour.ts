import { useContext } from "react";
import { TourContext, type Tour } from "./tourContext";

export function useTour(): Tour {
  return useContext(TourContext);
}
