import { useEffect, useRef } from "react";
import { useReducedMotion } from "../motion/motion";
import { useMotionPreferences } from "../motion/preferences";
import { createStarfield, type Sky } from "./engine";
import styles from "./Starfield.module.css";

/**
 * The background sky: a nebula wash under one canvas of stars (ADR-0017 §1). Fixed behind the
 * app, never interactive, hidden from assistive technology. `dim` quiets it behind dense screens
 * such as a game.
 */
export function Starfield({ dim = false }: { dim?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const sky = useRef<Sky | null>(null);
  const wantDim = useRef(dim);
  const reduced = useReducedMotion();
  const { cursorEffects } = useMotionPreferences();

  // `reduced` and `cursorEffects` are dependencies so the sky is rebuilt, not patched, when the
  // preference flips: the engine reads how strongly it answers the cursor once, at creation.
  useEffect(() => {
    if (!canvas.current) return;
    sky.current = createStarfield(canvas.current, () => wantDim.current);
    return () => {
      sky.current?.destroy();
      sky.current = null;
    };
  }, [reduced, cursorEffects]);

  useEffect(() => {
    if (wantDim.current === dim) return;
    wantDim.current = dim;
    sky.current?.refresh();
  }, [dim]);

  return (
    <div className={styles.sky} data-dim={dim} aria-hidden="true">
      <div className={styles.nebula} />
      <canvas ref={canvas} className={styles.canvas} />
    </div>
  );
}
