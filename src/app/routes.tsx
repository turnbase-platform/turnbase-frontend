import type { ReactNode } from "react";
import { LoginPage } from "../features/auth/LoginPage";
import { OAuthCompletionPage } from "../features/auth/OAuthCompletionPage";
import { RegisterPage } from "../features/auth/RegisterPage";
import { CatalogPage } from "../features/catalog/CatalogPage";
import { GameDetailPage } from "../features/catalog/GameDetailPage";
import { FriendsPage } from "../features/friends/FriendsPage";
import { ProfilePage } from "../features/profile/ProfilePage";
import { SettingsPage } from "../features/settings/SettingsPage";
import { LandingPage } from "./pages/LandingPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { PlaceholderPage } from "./pages/PlaceholderPage";

/**
 * Who may see a route (`platform-views.md` § Roles). Declared with the route — never checked
 * inside a view — so the tier of every screen is readable in one table and cannot be forgotten
 * by a new view.
 *
 * - `public`        everyone (Unauth, Guest, Registered)
 * - `anonymous`     Unauth only; an authenticated visitor is sent onward (VW-REDIR-001)
 * - `authenticated` Guest or Registered; Unauth is sent to log in (VW-REDIR-002)
 * - `registered`    Registered only; Guest gets the 403 view (VW-REDIR-003)
 */
export type Access = "public" | "anonymous" | "authenticated" | "registered";

export interface AppRoute {
  path: string;
  access: Access;
  element: ReactNode;
}

// Views owned by later work items render a placeholder here, so the tier table is complete
// from the start and each item replaces only its own `element`.
const later = (title: string) => <PlaceholderPage title={title} />;

export const appRoutes: readonly AppRoute[] = [
  { path: "/", access: "public", element: <LandingPage /> },
  { path: "/login", access: "anonymous", element: <LoginPage /> },
  { path: "/register", access: "anonymous", element: <RegisterPage /> },
  // "No (session not yet established)": the pending cookie, not a session, is its credential.
  { path: "/auth/complete-registration", access: "public", element: <OAuthCompletionPage /> },
  { path: "/games", access: "public", element: <CatalogPage /> },
  { path: "/games/:id", access: "public", element: <GameDetailPage /> },
  { path: "/users/:username", access: "public", element: <ProfilePage /> },
  { path: "/rooms", access: "authenticated", element: later("Active rooms") },
  { path: "/rooms/join/:code", access: "authenticated", element: later("Join a room") },
  { path: "/rooms/:id", access: "authenticated", element: later("Room") },
  { path: "/friends", access: "registered", element: <FriendsPage /> },
  { path: "/settings", access: "registered", element: <SettingsPage /> },
  { path: "*", access: "public", element: <NotFoundPage /> },
];
