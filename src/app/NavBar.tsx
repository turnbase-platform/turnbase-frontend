import { useLocation, useNavigate } from "react-router";
import { Button } from "@astryxdesign/core/Button";
import { DropdownMenu, type DropdownMenuOption } from "@astryxdesign/core/DropdownMenu";
import { TopNav, TopNavHeading, TopNavItem } from "@astryxdesign/core/TopNav";
import { useAuth } from "../features/auth/auth-context";
import { GuestButton } from "../features/auth/GuestButton";
import { NotificationBell } from "../features/notifications/NotificationBell";

/**
 * VW-NAV-001…012. Every element the current tier may not see is absent from the DOM rather than
 * disabled (NFR-USAB-001) — conditional rendering, never `isDisabled`.
 */
export function NavBar() {
  const { tier, principal, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isSignedIn = tier !== "unauth";

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

  return (
    <TopNav
      heading={<TopNavHeading heading="TurnBase" headingHref="/" />}
      startContent={
        <>
          <TopNavItem href="/games" label="Games" isSelected={pathname.startsWith("/games")} />
          {isSignedIn && (
            <TopNavItem href="/rooms" label="Rooms" isSelected={pathname.startsWith("/rooms")} />
          )}
          {tier === "registered" && (
            <TopNavItem href="/friends" label="Friends" isSelected={pathname === "/friends"} />
          )}
        </>
      }
      endContent={
        isSignedIn ? (
          <>
            <NotificationBell />
            <DropdownMenu
              button={{ label: principal?.username ?? "", variant: "ghost" }}
              items={menu}
              hasChevron
            />
          </>
        ) : (
          <>
            <Button label="Log in" variant="ghost" href="/login" />
            <Button label="Register" variant="secondary" href="/register" />
            <GuestButton variant="primary" />
          </>
        )
      }
    />
  );
}
