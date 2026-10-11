import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Button } from "@astryxdesign/core/Button";
import { useToast } from "@astryxdesign/core/Toast";
import { ApiError, rateLimitMessage } from "../../shared/api";
import { safeRedirect } from "../../shared/redirect";
import { useAuth } from "./auth-context";

/** "Play as Guest" (VW-NAV-009, VW-LAND-004). VW-REDIR-004: on success, /rooms — or the
 * validated `redirect` parameter when the visitor was sent to log in first. */
export function GuestButton({
  variant = "secondary",
  size,
}: {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
}) {
  const { startGuest } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const showToast = useToast();
  const [isBusy, setIsBusy] = useState(false);

  function play() {
    setIsBusy(true);
    startGuest()
      .then(() => navigate(safeRedirect(params.get("redirect")), { replace: true }))
      .catch((error: unknown) => {
        showToast({
          type: "error",
          body:
            error instanceof ApiError && error.status === 429
              ? rateLimitMessage(error, "guest sessions from this network")
              : "Could not start a guest session. Please try again.",
        });
      })
      .finally(() => {
        setIsBusy(false);
      });
  }

  return (
    <Button label="Play as Guest" variant={variant} size={size} isLoading={isBusy} onClick={play} />
  );
}
