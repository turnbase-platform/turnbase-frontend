import { useSyncExternalStore } from "react";
import { useLocation, useNavigate } from "react-router";
import { useAuth, type Tier } from "../features/auth/auth-context";

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

export interface NavLinkItem {
  href: string;
  label: string;
  isSelected: boolean;
  icon: "games" | "rooms" | "friends";
}

export interface NavMenuItem {
  label: string;
  onSelect: () => void;
}

export interface NavBarModel {
  tier: Tier;
  isSignedIn: boolean;
  narrow: boolean;
  username: string;
  links: NavLinkItem[];
  menu: NavMenuItem[];
}

/**
 * VW-NAV-001…012. Which elements the current tier may see is decided here, so the component only
 * renders what it is given — an element a tier may not see is absent, never disabled
 * (NFR-USAB-001).
 */
export function useNavBar(): NavBarModel {
  const { tier, principal, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const links: NavLinkItem[] = [
    { href: "/games", label: "Games", isSelected: pathname.startsWith("/games"), icon: "games" },
  ];
  if (tier !== "unauth") {
    links.push({
      href: "/rooms",
      label: "Rooms",
      isSelected: pathname.startsWith("/rooms"),
      icon: "rooms",
    });
  }
  if (tier === "registered") {
    links.push({
      href: "/friends",
      label: "Friends",
      isSelected: pathname === "/friends",
      icon: "friends",
    });
  }

  const menu: NavMenuItem[] = [
    {
      label: "View my profile",
      onSelect: () => {
        if (principal) void navigate(`/users/${encodeURIComponent(principal.username)}`);
      },
    },
    ...(tier === "registered"
      ? [{ label: "Account settings", onSelect: () => void navigate("/settings") }]
      : []),
    {
      label: "Log out",
      onSelect: () => {
        // Leave first: clearing the principal while on an authenticated route would make the
        // guard send the visitor to /login?redirect=<this page>, which is not where a
        // deliberate logout should end.
        void navigate("/");
        void logout();
      },
    },
  ];

  return {
    tier,
    isSignedIn: tier !== "unauth",
    narrow: useIsNarrow(),
    username: principal?.username ?? "",
    links,
    menu,
  };
}
