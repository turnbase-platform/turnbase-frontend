import { useEffect, useLayoutEffect } from "react";
import { prefersReducedMotion } from "../motion/motion";
import {
  applyMotionAttributes,
  readMotionPreferences,
  useMotionPreferences,
} from "../motion/preferences";

/** What the cursor spotlight lights: Astryx cards, the glass class, and anything that opts in. */
const SPOTLIGHT = ".astryx-card,.astryx-clickable-card,.tb-glass,[data-fx]";

/**
 * Pointer and scroll delegation (ADR-0017 §1). One listener of each kind writes CSS custom
 * properties and the stylesheets do the rest, so no component re-renders on a mouse move:
 *
 * - `--mx` / `--my` on a spotlight target: the pointer relative to its box;
 * - `--rx` / `--ry` and `data-active` on a `[data-tilt="<degrees>"]` element: the tilt;
 * - `--px` / `--py` (−1…1) and `--sy` on the root: the parallax the starfield and glows follow.
 *
 * Under `prefers-reduced-motion`, the Reduced-motion setting, or with Cursor effects switched off,
 * nothing is registered at all. Returns the teardown.
 */
export function initPointerEffects(): () => void {
  if (prefersReducedMotion() || !readMotionPreferences().cursorEffects) return () => undefined;

  const root = document.documentElement;
  let frame = 0;
  let x = 0;
  let y = 0;
  let path: EventTarget[] = [];
  let tilted: HTMLElement | null = null;

  const paint = () => {
    frame = 0;
    root.style.setProperty("--px", ((x / innerWidth) * 2 - 1).toFixed(3));
    root.style.setProperty("--py", ((y / innerHeight) * 2 - 1).toFixed(3));

    let tilt: HTMLElement | null = null;
    for (const node of path) {
      if (!(node instanceof HTMLElement)) continue;
      if (node.matches(SPOTLIGHT)) {
        const box = node.getBoundingClientRect();
        node.style.setProperty("--mx", `${String(x - box.left)}px`);
        node.style.setProperty("--my", `${String(y - box.top)}px`);
      }
      if (!tilt && node.hasAttribute("data-tilt")) tilt = node;
    }

    if (tilted && tilted !== tilt) {
      tilted.style.setProperty("--rx", "0deg");
      tilted.style.setProperty("--ry", "0deg");
      tilted.removeAttribute("data-active");
    }
    if (tilt) {
      const max = parseFloat(tilt.getAttribute("data-tilt") ?? "") || 8;
      const box = tilt.getBoundingClientRect();
      const nx = (x - box.left) / box.width - 0.5;
      const ny = (y - box.top) / box.height - 0.5;
      tilt.style.setProperty("--ry", `${(nx * max * 2).toFixed(2)}deg`);
      tilt.style.setProperty("--rx", `${(-ny * max * 2).toFixed(2)}deg`);
      tilt.setAttribute("data-active", "true");
    }
    tilted = tilt;
  };

  const onMove = (event: PointerEvent) => {
    x = event.clientX;
    y = event.clientY;
    path = event.composedPath();
    frame ||= requestAnimationFrame(paint);
  };
  const onScroll = () => {
    root.style.setProperty("--sy", String(scrollY));
  };

  addEventListener("pointermove", onMove, { passive: true });
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  return () => {
    removeEventListener("pointermove", onMove);
    removeEventListener("scroll", onScroll);
    if (frame) cancelAnimationFrame(frame);
  };
}

/**
 * Mount once, in the shell. Also puts the motion settings on `<html>` for the stylesheets, and
 * starts or stops the delegation when either setting changes.
 */
export function usePointerEffects(): void {
  const { cursorEffects, reduceMotion } = useMotionPreferences();
  // A layout effect, so the root is marked before the starfield (a child) reads its tokens.
  useLayoutEffect(() => {
    applyMotionAttributes({ cursorEffects, reduceMotion });
  }, [cursorEffects, reduceMotion]);
  useEffect(() => initPointerEffects(), [cursorEffects, reduceMotion]);
}
