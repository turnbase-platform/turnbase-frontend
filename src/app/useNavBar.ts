import { useLocation, useNavigate } from "react-router";
import { useAuth, type Tier } from "../features/auth/auth-context";
import { useTour } from "../features/onboarding/useTour";

export interface NavLinkItem {
  href: string;
  label: string;
  isSelected: boolean;
  icon: "games" | "rooms" | "friends";
}

export interface NavMenuItem {
  label: string;
  onSelect: () => void;
  /** `exit` items close the session and sit apart, last. */
  group: "main" | "exit";
}

export interface NavBarModel {
  tier: Tier;
  isSignedIn: boolean;
  username: string;
  links: NavLinkItem[];
  menu: NavMenuItem[];
}

/**
 * VW-NAV-001…012 (menu copy as the prototype shows it, ADR-0017 §5). Which elements the current tier may see is decided here, so the component only
 * renders what it is given — an element a tier may not see is absent, never disabled
 * (NFR-USAB-001).
 */
export function useNavBar(): NavBarModel {
  const { tier, principal, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const tour = useTour();

  // The landing page already leads with "Browse all games"; the bar does not repeat it there.
  const links: NavLinkItem[] =
    pathname === "/"
      ? []
      : [
          {
            href: "/games",
            label: "Games",
            isSelected: pathname.startsWith("/games"),
            icon: "games",
          },
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
      label: "Profile",
      group: "main",
      onSelect: () => {
        if (principal) void navigate(`/users/${encodeURIComponent(principal.username)}`);
      },
    },
    ...(tier === "registered"
      ? [{ label: "Settings", group: "main" as const, onSelect: () => void navigate("/settings") }]
      : []),
    { label: "Replay the tour", group: "main", onSelect: tour.open },
    {
      label: tier === "guest" ? "Leave as guest" : "Sign out",
      group: "exit",
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
    username: principal?.username ?? "",
    links,
    menu,
  };
}
