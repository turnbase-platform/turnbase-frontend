import { createContext, useContext } from "react";

/** `rest-conventions.md` § Authentication: the principal representation. */
export interface Principal {
  userId: string;
  username: string;
  kind: "REGISTERED" | "GUEST";
}

/** The three tiers of `platform-views.md`. */
export type Tier = "unauth" | "guest" | "registered";

export interface Credentials {
  usernameOrEmail: string;
  password: string;
}

export interface Registration {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface AuthState {
  /** `false` until the first `GET /api/auth/session` answers — no tier is known before that. */
  isReady: boolean;
  principal: Principal | null;
  tier: Tier;
  login: (credentials: Credentials) => Promise<void>;
  register: (registration: Registration) => Promise<void>;
  startGuest: () => Promise<void>;
  logout: () => Promise<void>;
  /** For flows that mint a session outside the auth context (OAuth completion). */
  acceptPrincipal: (principal: Principal) => void;
  /** The server ended the session without a request of ours failing (`SESSION_DISPLACED`). */
  clearPrincipal: () => void;
}

export const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const state = useContext(AuthContext);
  if (!state) throw new Error("useAuth must be used inside <AuthProvider>");
  return state;
}

export function tierOf(principal: Principal | null): Tier {
  if (!principal) return "unauth";
  return principal.kind === "GUEST" ? "guest" : "registered";
}
