import type { ComponentType, ReactNode } from "react";
import { BrowserRouter, Link } from "react-router";
import { LinkProvider } from "@astryxdesign/core/Link";
import { ToastViewport } from "@astryxdesign/core/Toast";
import { turnbaseTheme } from "../theme/turnbase";
import { AuthProvider } from "../features/auth/AuthProvider";
import { AppearanceProvider, ThemedRoot } from "./AppearanceProvider";
import { Shell } from "./Shell";
import { TourProvider } from "../features/onboarding/TourProvider";

// There are no route loaders/Suspense boundaries here, so wrapping navigations in a React
// transition (react-router's default) buys nothing — it only lets an unrelated synchronous
// update (e.g. AuthProvider clearing the principal on a 401) commit ahead of an in-flight
// navigation and win a race it shouldn't be in.
function DefaultRouter({ children }: { children: ReactNode }) {
  return <BrowserRouter useTransitions={false}>{children}</BrowserRouter>;
}

// shell-architecture.md §2: the shell mounts `<Theme>` and `<LinkProvider>` once, at the root.
// Without LinkProvider every Astryx Link (and every component rendering one) is a plain
// `<a href>` and a click reloads the page — dropping the STOMP connection and all in-memory
// session state. The router sits between the two because `Link` needs it.
export function App({
  Router = DefaultRouter,
}: {
  Router?: ComponentType<{ children: ReactNode }>;
}) {
  return (
    <AppearanceProvider>
      <ThemedRoot theme={turnbaseTheme}>
        <Router>
          <LinkProvider component={Link}>
            <ToastViewport>
              <AuthProvider>
                <TourProvider>
                  <Shell />
                </TourProvider>
              </AuthProvider>
            </ToastViewport>
          </LinkProvider>
        </Router>
      </ThemedRoot>
    </AppearanceProvider>
  );
}
