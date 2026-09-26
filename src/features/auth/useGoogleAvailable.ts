import { useEffect, useState } from "react";
import { apiFetch } from "../../shared/api";

/**
 * `GET /api/auth/providers` (IMP-GATE-76): VW-LOGIN-002 / VW-REG-002 hide the Google button when
 * the deployment has no client secret. Until the answer arrives, and on any failure, the button
 * stays absent — a missing button is recoverable, a button that leads to a 404 is not.
 */
export function useGoogleAvailable(): boolean {
  const [google, setGoogle] = useState(false);
  useEffect(() => {
    let cancelled = false;
    apiFetch<{ google: boolean }>("/api/auth/providers")
      .then((providers) => {
        if (!cancelled) setGoogle(providers.google);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);
  return google;
}
