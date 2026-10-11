import { Button } from "@astryxdesign/core/Button";
import { DropdownMenu } from "@astryxdesign/core/DropdownMenu";
import { TopNav, TopNavHeading, TopNavItem } from "@astryxdesign/core/TopNav";
import { GuestButton } from "../features/auth/GuestButton";
import { NotificationBell } from "../features/notifications/NotificationBell";
import { IGames, IRooms, IUsers, Logo } from "../ui";
import { AppearanceControl } from "./AppearanceControl";
import styles from "./NavBar.module.css";
import type { NavBarModel } from "./useNavBar";

const ICONS = { games: IGames, rooms: IRooms, friends: IUsers };

/**
 * The shell header. Renders a {@link NavBarModel}; every decision about who sees what is in
 * `useNavBar`. At phone width the links, bell and menu cannot share one row, so the links (and,
 * signed out, the three calls to action) take a second row that wraps instead of overlapping.
 */
export function NavBar({ model }: { model: NavBarModel }) {
  const { isSignedIn, narrow, username, links, menu } = model;

  const heading = <TopNavHeading logo={<Logo size={28} />} heading="TurnBase" headingHref="/" />;
  const items = links.map(({ href, label, isSelected, icon }) => {
    const Icon = ICONS[icon];
    return (
      <TopNavItem
        key={href}
        href={href}
        label={label}
        isSelected={isSelected}
        icon={<Icon size={18} />}
      />
    );
  });
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
        button={{ label: username, variant: "ghost" }}
        items={menu.map(({ label, onSelect }) => ({ label, onClick: onSelect }))}
        hasChevron
      />
    </>
  );

  if (narrow) {
    return (
      <header className={styles.header}>
        <TopNav heading={heading} endContent={isSignedIn ? account : undefined} />
        <div className={styles.second}>
          {items}
          {!isSignedIn && signedOut}
          <AppearanceControl />
        </div>
      </header>
    );
  }

  return (
    <header className={styles.header}>
      <TopNav
        heading={heading}
        startContent={items}
        endContent={
          <>
            <AppearanceControl />
            {isSignedIn ? account : signedOut}
          </>
        }
      />
    </header>
  );
}
