import { useState } from "react";

export type Direction = "fwd" | "back" | "up";

const depth = (path: string) => path.split("/").filter(Boolean).length;

function rank(path: string, sections: readonly string[]): number {
  return sections.findIndex((s) => path === s || path.startsWith(`${s}/`));
}

/**
 * Which way the page should move between two routes: across the top-level `sections` it follows
 * their order (left → right along the nav), inside one section deeper is forward, and anything
 * else simply rises.
 */
export function directionBetween(from: string, to: string, sections: readonly string[]): Direction {
  const a = rank(from, sections);
  const b = rank(to, sections);
  if (a >= 0 && b >= 0 && a !== b) return b > a ? "fwd" : "back";
  if (depth(from) !== depth(to)) return depth(to) > depth(from) ? "fwd" : "back";
  return "up";
}

/** Direction of the latest change of `path`, remembered until the next one. */
export function useDirection(path: string, sections: readonly string[]): Direction {
  const [seen, setSeen] = useState<{ path: string; direction: Direction }>({
    path,
    direction: "up",
  });
  if (seen.path !== path) setSeen({ path, direction: directionBetween(seen.path, path, sections) });
  return seen.direction;
}
