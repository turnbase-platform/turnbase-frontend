import type { ReactNode } from "react";
import { Navigate, useLocation, useSearchParams } from "react-router";
import { Spinner } from "@astryxdesign/core/Spinner";
import { useAuth } from "../features/auth/auth-context";
import { safeRedirect } from "../shared/redirect";
import type { Access } from "./routes";
import { ForbiddenPage } from "./pages/ForbiddenPage";

/**
 * shell-architecture.md §3: the guard is UX, not security. It exists to avoid rendering a page
 * that will 401; the server refuses what it must regardless.
 *
 * Reading the *current* principal on every render is also what makes VW-REDIR-007 work: a 401
 * clears the principal, this component re-renders, and an authenticated route becomes an
 * Unauth one — so a mid-session expiry redirects rather than blanking the view.
 */
export function RouteGuard({ access, children }: { access: Access; children: ReactNode }) {
  const { isReady, tier } = useAuth();
  const location = useLocation();
  const [params] = useSearchParams();

  if (access === "public") return children;
  // No tier is known until the first session check answers; deciding earlier would bounce a
  // signed-in visitor through /login on every full page load.
  if (!isReady) return <Spinner label="Loading" />;

  if (access === "anonymous") {
    // VW-REDIR-001, and VW-REDIR-004/005/006 for a login that just succeeded: the destination
    // is the validated `redirect` parameter, else /rooms.
    return tier === "unauth" ? (
      children
    ) : (
      <Navigate to={safeRedirect(params.get("redirect"))} replace />
    );
  }

  if (tier === "unauth") {
    const original = location.pathname + location.search + location.hash;
    return <Navigate to={`/login?redirect=${encodeURIComponent(original)}`} replace />;
  }
  if (access === "registered" && tier === "guest") return <ForbiddenPage />;
  return children;
}
