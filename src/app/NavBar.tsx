import { useRef } from "react";
import { Link } from "react-router";
import { Button } from "@astryxdesign/core/Button";
import {
  DropdownMenu,
  DropdownMenuDivider,
  DropdownMenuItem,
} from "@astryxdesign/core/DropdownMenu";
import { GuestButton } from "../features/auth/GuestButton";
import { NotificationBell } from "../features/notifications/NotificationBell";
import { IGames, IRooms, IUsers, Logo, Person, useIndicator } from "../ui";
import { AppearanceMenuGroup } from "./AppearanceMenuGroup";
import styles from "./NavBar.module.css";
import type { NavBarModel } from "./useNavBar";

const ICONS = { games: IGames, rooms: IRooms, friends: IUsers };

/**
 * The shell's navigation: a floating glass pill over the sky (a bar at the foot of the screen on a
 * phone). Renders a {@link NavBarModel}; every decision about who sees what is in `useNavBar`.
 * A highlight slides to the selected link.
 */
export function NavBar({ model }: { model: NavBarModel }) {
  const { isSignedIn, username, links, menu } = model;
  const linkBox = useRef<HTMLDivElement>(null);
  const indicator = useIndicator(
    linkBox,
    "a",
    links.findIndex((l) => l.isSelected),
    links.map((l) => l.href).join("|"),
  );

  const exit = menu.filter((m) => m.group === "exit");
  return (
    <nav className={`${styles.nav} tb-glass`} aria-label="Main" data-signed-in={isSignedIn}>
      <Link to={isSignedIn ? "/games" : "/"} className={styles.logo} aria-label="TurnBase home">
        <Logo size={28} />
        TurnBase
      </Link>

      <div className={styles.links} ref={linkBox}>
        {indicator && (
          <span
            className={styles.indicator}
            aria-hidden="true"
            style={{ left: indicator.left, width: indicator.width }}
          />
        )}
        {links.map(({ href, label, isSelected, icon }) => {
          const Icon = ICONS[icon];
          return (
            <Link
              key={href}
              to={href}
              className={styles.link}
              aria-current={isSelected ? "page" : undefined}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </div>

      <div className={styles.end}>
        {isSignedIn ? (
          <>
            <NotificationBell />
            <div className={styles.profile}>
              <DropdownMenu
                button={{
                  label: `${username} menu`,
                  icon: <Person name={username} size="sm" />,
                  isIconOnly: true,
                  variant: "ghost",
                }}
                hasChevron={false}
                placement="below"
                alignment="end"
              >
                {menu
                  .filter((m) => m.group === "main")
                  .map((m) => (
                    <DropdownMenuItem key={m.label} label={m.label} onClick={m.onSelect} />
                  ))}
                <DropdownMenuDivider />
                <AppearanceMenuGroup />
                <DropdownMenuDivider />
                {exit.map((m) => (
                  <DropdownMenuItem key={m.label} label={m.label} onClick={m.onSelect} />
                ))}
              </DropdownMenu>
            </div>
          </>
        ) : (
          <>
            <div className={styles.hideSmall}>
              <Button label="Log in" variant="ghost" href="/login" />
            </div>
            <div className={styles.hideSmall}>
              <GuestButton variant="ghost" />
            </div>
            <Button label="Create account" variant="primary" href="/register" />
          </>
        )}
      </div>
    </nav>
  );
}
