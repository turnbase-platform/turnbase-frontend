/** Top-level sections in nav order: a page slides forward to a later one and back to an earlier one. */
export const SECTIONS = ["/games", "/rooms", "/friends", "/users", "/settings"] as const;

/**
 * How much room a route gets: the landing runs edge to edge (`bare`), a room in play is wide, and
 * everything else sits in the standard column.
 */
export type Frame = "bare" | "wide" | "normal";

export function frameFor(pathname: string): Frame {
  if (pathname === "/") return "bare";
  if (/^\/rooms\/[^/]+$/.test(pathname)) return "wide";
  return "normal";
}
