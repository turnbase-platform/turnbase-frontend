// Test-only helper, never part of a Fast Refresh boundary.
import type { ReactNode } from "react";
import { vi } from "vitest";
import { MemoryRouter } from "react-router";
import { AuthContext, tierOf, type AuthState, type Principal } from "../features/auth/auth-context";

/** An `AuthState` whose actions are spies, for rendering one hook or view without the provider. */
export function fakeAuth(principal: Principal | null = null, over: Partial<AuthState> = {}) {
  const state: AuthState = {
    isReady: true,
    principal,
    tier: tierOf(principal),
    login: vi.fn(() => Promise.resolve()),
    register: vi.fn(() => Promise.resolve()),
    startGuest: vi.fn(() => Promise.resolve()),
    logout: vi.fn(() => Promise.resolve()),
    acceptPrincipal: vi.fn(),
    clearPrincipal: vi.fn(),
    ...over,
  };
  return state;
}

/** Router + auth context around a hook under test. */
export function authWrapper(state: AuthState, path = "/") {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={[path]} useTransitions={false}>
        <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
      </MemoryRouter>
    );
  };
}
