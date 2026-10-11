import type { SVGProps } from "react";

export type IconProps = SVGProps<SVGSVGElement> & { size?: number };

/** A 24-unit line glyph in the colour of the surrounding text. Decorative: pair it with a label. */
function Glyph({ size = 20, children, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export function IHome(props: IconProps) {
  return (
    <Glyph {...props}>
      <>
        <path d="M3 11l9-8 9 8" />
        <path d="M5 10v10h5v-6h4v6h5V10" />
      </>
    </Glyph>
  );
}
export function IGames(props: IconProps) {
  return (
    <Glyph {...props}>
      <>
        <rect x="2" y="7" width="20" height="11" rx="4" />
        <path d="M7 10v5M4.5 12.5h5" />
        <circle cx="16" cy="11.5" r="0.6" />
        <circle cx="18.5" cy="14" r="0.6" />
      </>
    </Glyph>
  );
}
export function IRooms(props: IconProps) {
  return (
    <Glyph {...props}>
      <>
        <path d="M5 21V4a1 1 0 011-1h12a1 1 0 011 1v17" />
        <path d="M3 21h18" />
        <circle cx="15" cy="12" r="0.8" />
      </>
    </Glyph>
  );
}
export function IUsers(props: IconProps) {
  return (
    <Glyph {...props}>
      <>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
        <circle cx="17" cy="9" r="2.5" />
        <path d="M17.5 14c2.6.2 4 2 4 4.5" />
      </>
    </Glyph>
  );
}
export function IUser(props: IconProps) {
  return (
    <Glyph {...props}>
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
      </>
    </Glyph>
  );
}
export function ISettings(props: IconProps) {
  return (
    <Glyph {...props}>
      <>
        <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
        <circle cx="16" cy="7" r="2" />
        <circle cx="8" cy="17" r="2" />
      </>
    </Glyph>
  );
}
export function IBell(props: IconProps) {
  return (
    <Glyph {...props}>
      <>
        <path d="M6 17v-6a6 6 0 0112 0v6l2 2H4z" />
        <path d="M10 21h4" />
      </>
    </Glyph>
  );
}
export function ISearch(props: IconProps) {
  return (
    <Glyph {...props}>
      <>
        <circle cx="11" cy="11" r="6.5" />
        <path d="M16 16l5 5" />
      </>
    </Glyph>
  );
}
export function IPlus(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M12 5v14M5 12h14" />
    </Glyph>
  );
}
export function ICheck(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M5 12.5l4.5 4.5L19 7" />
    </Glyph>
  );
}
export function IX(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Glyph>
  );
}
export function IArrow(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M4 12h16M14 6l6 6-6 6" />
    </Glyph>
  );
}
export function IPlay(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M7 4l13 8-13 8z" />
    </Glyph>
  );
}
export function IEye(props: IconProps) {
  return (
    <Glyph {...props}>
      <>
        <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
        <circle cx="12" cy="12" r="3" />
      </>
    </Glyph>
  );
}
export function ILink(props: IconProps) {
  return (
    <Glyph {...props}>
      <>
        <path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1" />
        <path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1" />
      </>
    </Glyph>
  );
}
export function ICopy(props: IconProps) {
  return (
    <Glyph {...props}>
      <>
        <rect x="9" y="9" width="11" height="11" rx="2" />
        <path d="M5 15V6a2 2 0 012-2h9" />
      </>
    </Glyph>
  );
}
export function ILock(props: IconProps) {
  return (
    <Glyph {...props}>
      <>
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V8a4 4 0 018 0v3" />
      </>
    </Glyph>
  );
}
export function IGlobe(props: IconProps) {
  return (
    <Glyph {...props}>
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" />
      </>
    </Glyph>
  );
}
export function ICrown(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" />
    </Glyph>
  );
}
export function ITrophy(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M7 4h10v5a5 5 0 01-10 0zM7 6H4v1a3 3 0 003 3M17 6h3v1a3 3 0 01-3 3M12 14v4M8 21h8" />
    </Glyph>
  );
}
export function IClock(props: IconProps) {
  return (
    <Glyph {...props}>
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    </Glyph>
  );
}
export function IChat(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M4 5h16v11H9l-5 4z" />
    </Glyph>
  );
}
export function ISend(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M3 11l18-8-8 18-2-8z" />
    </Glyph>
  );
}
export function IRefresh(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M20 11a8 8 0 10-2.3 5.7M20 4v7h-7" />
    </Glyph>
  );
}
export function ILogout(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M10 4H5v16h5M15 8l4 4-4 4M19 12H9" />
    </Glyph>
  );
}
export function ISun(props: IconProps) {
  return (
    <Glyph {...props}>
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </>
    </Glyph>
  );
}
export function IMoon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M20 14A8 8 0 019.5 4 8 8 0 1020 14z" />
    </Glyph>
  );
}
export function IMonitor(props: IconProps) {
  return (
    <Glyph {...props}>
      <>
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M8 20h8M12 16v4" />
      </>
    </Glyph>
  );
}
export function IStar(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M12 3l2.7 5.8 6.3.8-4.6 4.4 1.2 6.3L12 17.2l-5.6 3.1 1.2-6.3L3 9.6l6.3-.8z" />
    </Glyph>
  );
}
export function IRocket(props: IconProps) {
  return (
    <Glyph {...props}>
      <>
        <path d="M12 3c3 2 5 5 5 9l-2 4H9l-2-4c0-4 2-7 5-9z" />
        <circle cx="12" cy="10" r="1.5" />
        <path d="M9 16l-2 4 3-1.5M15 16l2 4-3-1.5" />
      </>
    </Glyph>
  );
}
export function ICode(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M8 7l-5 5 5 5M16 7l5 5-5 5" />
    </Glyph>
  );
}
export function ISortAsc(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M4 7h5M4 12h8M4 17h11M19 19V6M15.5 9.5L19 6l3.5 3.5" />
    </Glyph>
  );
}
export function ISortDesc(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M4 7h11M4 12h8M4 17h5M19 5v13M15.5 14.5L19 18l3.5-3.5" />
    </Glyph>
  );
}
export function IFilter(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M3 5h18l-7 8v6l-4-2v-4z" />
    </Glyph>
  );
}
export function ISparkle(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
    </Glyph>
  );
}
export function IDice(props: IconProps) {
  return (
    <Glyph {...props}>
      <>
        <rect x="4" y="4" width="16" height="16" rx="3" />
        <circle cx="9" cy="9" r="0.8" />
        <circle cx="15" cy="15" r="0.8" />
        <circle cx="15" cy="9" r="0.8" />
        <circle cx="9" cy="15" r="0.8" />
      </>
    </Glyph>
  );
}
export function IShield(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
    </Glyph>
  );
}
export function IChevron(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M6 9l6 6 6-6" />
    </Glyph>
  );
}
export function IUpload(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M12 16V4M7 9l5-5 5 5M4 20h16" />
    </Glyph>
  );
}
export function IMail(props: IconProps) {
  return (
    <Glyph {...props}>
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 7l9 6 9-6" />
      </>
    </Glyph>
  );
}
export function IUserPlus(props: IconProps) {
  return (
    <Glyph {...props}>
      <>
        <circle cx="10" cy="8" r="4" />
        <path d="M3 21c0-4 3-6.5 7-6.5M18 9v6M15 12h6" />
      </>
    </Glyph>
  );
}
export function IMore(props: IconProps) {
  return (
    <Glyph {...props}>
      <>
        <circle cx="5" cy="12" r="1" />
        <circle cx="12" cy="12" r="1" />
        <circle cx="19" cy="12" r="1" />
      </>
    </Glyph>
  );
}
/** The Google "G" mark, filled rather than stroked. */
export const IGoogle = ({ size = 20, ...rest }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="currentColor"
    aria-hidden="true"
    {...rest}
  >
    <path d="M21.35 11.1H12v2.9h5.35c-.5 2.4-2.5 3.8-5.35 3.8a5.8 5.8 0 010-11.6c1.4 0 2.6.5 3.55 1.35l2.1-2.1A8.7 8.7 0 0012 3.2a8.8 8.8 0 100 17.6c5 0 8.5-3.5 8.5-8.5 0-.4 0-.8-.15-1.2z" />
  </svg>
);
