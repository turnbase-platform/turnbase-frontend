import { useAuth } from "../../features/auth/auth-context";
import { useTour } from "../../features/onboarding/useTour";

/** VW-LAND-002…004: the calls to action are for Unauth only, and absent — not disabled — after. */
export function useLandingPage(): { showActions: boolean; openTour: () => void } {
  const { tier } = useAuth();
  const tour = useTour();
  return { showActions: tier === "unauth", openTour: tour.open };
}
