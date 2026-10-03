import { useSyncExternalStore } from "react";
import { useLocation, useNavigate } from "react-router";
import { Button } from "@astryxdesign/core/Button";
import { DropdownMenu, type DropdownMenuOption } from "@astryxdesign/core/DropdownMenu";
import { Stack } from "@astryxdesign/core/Stack";
import { TopNav, TopNavHeading, TopNavItem } from "@astryxdesign/core/TopNav";
import { useAuth } from "../features/auth/auth-context";
import { GuestButton } from "../features/auth/GuestButton";
import { NotificationBell } from "../features/notifications/NotificationBell";

const NARROW = "(max-width: 640px)";

/** True on a phone-width viewport (RR-07: the one-row header collides at 400 px). */
function useIsNarrow(): boolean {
  return useSyncExternalStore(
    (notify) => {
      const query = window.matchMedia(NARROW);
      query.addEventListener("change", notify);
      return () => {
        query.removeEventListener("change", notify);
      };
    },
    () => window.matchMedia(NARROW).matches,
  );
}

/**
 * VW-NAV-001…012. Every element the current tier may not see is absent from the DOM rather than
 * disabled (NFR-USAB-001) — conditional rendering, never `isDisabled`.
 */
export function NavBar() {
  const { tier, principal, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isSignedIn = tier !== "unauth";
  const narrow = useIsNarrow();

  const menu: DropdownMenuOption[] = [
    {
      label: "View my profile",
      onClick: () => {
        if (principal) void navigate(`/users/${encodeURIComponent(principal.username)}`);
      },
    },
    ...(tier === "registered"
      ? [{ label: "Account settings", onClick: () => void navigate("/settings") }]
      : []),
    {
      label: "Log out",
      onClick: () => {
        // Leave first: clearing the principal while on an authenticated route would make the
        // guard send the visitor to /login?redirect=<this page>, which is not where a
        // deliberate logout should end.
        void navigate("/");
        void logout();
      },
    },
  ];

  const links = (
    <>
      <TopNavItem href="/games" label="Games" isSelected={pathname.startsWith("/games")} />
      {isSignedIn && (
        <TopNavItem href="/rooms" label="Rooms" isSelected={pathname.startsWith("/rooms")} />
      )}
      {tier === "registered" && (
        <TopNavItem href="/friends" label="Friends" isSelected={pathname === "/friends"} />
      )}
    </>
  );
  const signedOut = (
    <>
      <Button label="Log in" variant="ghost" href="/login" />
      <Button label="Register" variant="secondary" href="/register" />
      <GuestButton variant="primary" />
    </>
  );
  const account = (
    <>
      <NotificationBell />
      <DropdownMenu
        button={{ label: principal?.username ?? "", variant: "ghost" }}
        items={menu}
        hasChevron
      />
    </>
  );

  // At phone width the links, bell and menu cannot share one row; the links (and, signed out,
  // the three calls to action) take a second row that wraps instead of overlapping.
  if (narrow) {
    return (
      <Stack as="header">
        <TopNav
          heading={<TopNavHeading heading="TurnBase" headingHref="/" />}
          endContent={isSignedIn ? account : undefined}
        />
        <Stack direction="horizontal" wrap="wrap" gap={1} padding={2}>
          {links}
          {!isSignedIn && signedOut}
        </Stack>
      </Stack>
    );
  }

  return (
    <Stack as="header">
      <TopNav
        heading={<TopNavHeading heading="TurnBase" headingHref="/" />}
        startContent={links}
        endContent={isSignedIn ? account : signedOut}
      />
    </Stack>
  );
}
