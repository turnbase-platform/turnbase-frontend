import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiFetch, onUnauthorized } from "../../shared/api";
import {
  AuthContext,
  tierOf,
  type AuthState,
  type Credentials,
  type Principal,
  type Registration,
} from "./auth-context";

/**
 * Owns the one cached principal (shell-architecture.md §3). Its tier is what the route guard
 * and the nav bar both read, so the two cannot disagree about who the user is.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [principal, setPrincipal] = useState<Principal | null>(null);

  useEffect(() => {
    let cancelled = false;
    // A 401 here is the ordinary answer to "who am I?" for a visitor, not a session ending.
    apiFetch<Principal>("/api/auth/session", { expectUnauthorized: true })
      .then((found) => {
        if (!cancelled) setPrincipal(found);
      })
      // Anything but a session (401, network down, 5xx) leaves the visitor treated as signed
      // out; the guard is UX, not security, and the server still refuses what it must.
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setIsReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // VW-REDIR-007: a 401 from any request clears the principal; the route guard, which reads
  // it, does the redirect to /login?redirect=<current>.
  useEffect(
    () =>
      onUnauthorized(() => {
        setPrincipal(null);
      }),
    [],
  );

  const login = useCallback(async (credentials: Credentials) => {
    setPrincipal(
      await apiFetch<Principal>("/api/auth/login", {
        method: "POST",
        body: credentials,
        expectUnauthorized: true,
      }),
    );
  }, []);

  const register = useCallback(async (registration: Registration) => {
    setPrincipal(
      await apiFetch<Principal>("/api/auth/register", { method: "POST", body: registration }),
    );
  }, []);

  const startGuest = useCallback(async () => {
    setPrincipal(await apiFetch<Principal>("/api/auth/guest", { method: "POST" }));
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiFetch<undefined>("/api/auth/logout", { method: "POST", expectUnauthorized: true });
    } finally {
      // Whatever the server said, this browser is done with the session.
      setPrincipal(null);
    }
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      isReady,
      principal,
      tier: tierOf(principal),
      login,
      register,
      startGuest,
      logout,
      acceptPrincipal: setPrincipal,
      clearPrincipal: () => {
        setPrincipal(null);
      },
    }),
    [isReady, principal, login, register, startGuest, logout],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}
