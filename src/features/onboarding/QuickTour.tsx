import { QuickTourView } from "./QuickTourView";
import { useQuickTour } from "./useQuickTour";

/** Mounted once by the shell; opened through `useTour`. */
export function QuickTour() {
  return <QuickTourView tour={useQuickTour()} />;
}
