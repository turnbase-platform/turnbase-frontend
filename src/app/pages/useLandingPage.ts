import { useAuth } from "../../features/auth/auth-context";

/** VW-LAND-002…004: the calls to action are for Unauth only, and absent — not disabled — after. */
export function useLandingPage(): { showActions: boolean } {
  const { tier } = useAuth();
  return { showActions: tier === "unauth" };
}
