import { prefersReducedMotion } from "../motion/motion";
import styles from "./Starfield.module.css";

type Rgb = [number, number, number];
interface Star {
  x: number;
  y: number;
  z: number;
  r: number;
  p: number;
  c: 0 | 1 | 2;
}
interface Shooter {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

export interface Sky {
  /** Repaint after the dim level changed (the loop does it by itself while animating). */
  refresh(): void;
  destroy(): void;
}

const FALLBACK: Rgb[] = [
  [255, 255, 255],
  [46, 230, 246],
  [255, 111, 198],
];

function parse(css: string): Rgb {
  const m = css.match(/[\d.]+/g);
  return m && m.length >= 3
    ? [Math.round(+m[0]), Math.round(+m[1]), Math.round(+m[2])]
    : [255, 255, 255];
}

/**
 * One canvas, layered stars. They drift with cursor and scroll parallax, brighten and flee the
 * pointer, and now and then a shooting star crosses. NFR-PERF-002 shapes the rest:
 *
 * - **hidden tab** → the frame loop is cancelled and resumes on return;
 * - **`prefers-reduced-motion`** → one static frame, no loop, no pointer or scroll listeners.
 *
 * Star colours are read from `--tb-star-a|b|c` so the sky follows Light and Dark. Returns `null`
 * where the browser gives no 2d context.
 */
export function createStarfield(canvas: HTMLCanvasElement, getDim: () => boolean): Sky | null {
  const context = canvas.getContext("2d");
  if (!context) return null;
  const ctx: CanvasRenderingContext2D = context;

  const reduce = prefersReducedMotion();
  const probes = (["a", "b", "c"] as const).map((k) => {
    const probe = document.createElement("i");
    probe.className = styles.probe;
    probe.style.setProperty("color", `var(--tb-star-${k})`);
    document.body.appendChild(probe);
    return probe;
  });
  let cols: Rgb[] = FALLBACK;
  let dark = true;
  let react = 1; // --tb-bg-react: how strongly stars answer the cursor
  const readColours = () => {
    react = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--tb-bg-react"),
    );
    if (Number.isNaN(react)) react = 1;
    cols = probes.map((p) => parse(getComputedStyle(p).color));
    const [r, g, b] = cols[0];
    dark = (r + g + b) / 3 > 128;
  };

  let w = 0;
  let h = 0;
  let stars: Star[] = [];
  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    w = innerWidth;
    h = innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = Array.from({ length: Math.round((w * h) / 5200) }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      z: 0.15 + Math.random() * 0.85,
      r: 0.5 + Math.random() * 1.1,
      p: Math.random() * 6.28,
      c: Math.random() < 0.8 ? 0 : Math.random() < 0.5 ? 1 : 2,
    }));
    if (reduce) draw(0);
  };

  let mx = -9999;
  let my = -9999;
  let px = 0;
  let py = 0;
  let tpx = 0;
  let tpy = 0;
  const onMove = (e: PointerEvent) => {
    mx = e.clientX;
    my = e.clientY;
    tpx = (mx / w) * 2 - 1;
    tpy = (my / h) * 2 - 1;
  };
  const onLeave = () => {
    mx = my = -9999;
  };

  let shooter: Shooter | null = null;
  let nextShot = performance.now() + 3500;
  let level = getDim() ? 0.35 : 1;
  let frame = 0;
  let tick = 0;

  function draw(t: number) {
    if (tick++ % 40 === 0) readColours();
    const dim = getDim();
    px += (tpx - px) * 0.05;
    py += (tpy - py) * 0.05;
    level = reduce ? (dim ? 0.35 : 1) : level + ((dim ? 0.35 : 1) - level) * 0.05;
    ctx.clearRect(0, 0, w, h);
    const sy = reduce ? 0 : scrollY;
    const baseAlpha = (dark ? 0.85 : 0.55) * level;
    for (const s of stars) {
      let x = s.x - px * s.z * 16 * react;
      let y = (((s.y - sy * s.z * 0.22 - py * s.z * 12 * react) % h) + h) % h;
      const dx = x - mx;
      const dy = y - my;
      const d = Math.hypot(dx, dy);
      let boost = 0;
      if (d < 150) {
        const k = 1 - d / 150;
        boost = k * react;
        x += (dx / (d || 1)) * k * k * 30 * react;
        y += (dy / (d || 1)) * k * k * 30 * react;
      }
      const twinkle = reduce ? 1 : 0.65 + 0.35 * Math.sin(t / 700 + s.p);
      const alpha = Math.min(1, (0.25 + s.z * 0.6) * twinkle * baseAlpha + boost * 0.7);
      const [r, g, b] = boost > 0.25 && s.c === 0 ? cols[1] : cols[s.c];
      ctx.fillStyle = `rgba(${String(r)},${String(g)},${String(b)},${String(alpha)})`;
      const size = s.r * (0.7 + s.z * 0.8) * (1 + boost * 0.9);
      ctx.fillRect(Math.round(x), Math.round(y), size, size);
    }
    if (!reduce) shoot(t, dim);
  }

  function shoot(t: number, dim: boolean) {
    if (!shooter && t > nextShot && !dim) {
      const fromLeft = Math.random() < 0.5;
      shooter = {
        x: fromLeft ? -40 : w + 40,
        y: Math.random() * h * 0.5,
        vx: (fromLeft ? 1 : -1) * (9 + Math.random() * 4),
        vy: 3 + Math.random() * 3,
        life: 1,
      };
    }
    if (!shooter) return;
    const s = shooter;
    s.x += s.vx;
    s.y += s.vy;
    s.life -= 0.012;
    const [r, g, b] = dark ? cols[1] : cols[2];
    const tail = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * 9, s.y - s.vy * 9);
    tail.addColorStop(0, `rgba(${String(r)},${String(g)},${String(b)},${String(0.9 * s.life)})`);
    tail.addColorStop(1, `rgba(${String(r)},${String(g)},${String(b)},0)`);
    ctx.strokeStyle = tail;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(s.x - s.vx * 9, s.y - s.vy * 9);
    ctx.stroke();
    if (s.life <= 0 || s.x < -200 || s.x > w + 200 || s.y > h + 100) {
      shooter = null;
      nextShot = t + 7000 + Math.random() * 7000;
    }
  }

  const loop = (t: number) => {
    frame = requestAnimationFrame(loop);
    draw(t);
  };
  const play = () => {
    if (!frame && !reduce) frame = requestAnimationFrame(loop);
  };
  const pause = () => {
    cancelAnimationFrame(frame);
    frame = 0;
  };
  const onVisibility = () => {
    if (document.hidden) pause();
    else play();
  };

  readColours();
  resize();
  addEventListener("resize", resize);
  if (!reduce) {
    addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    document.addEventListener("visibilitychange", onVisibility);
    if (!document.hidden) play();
  }

  return {
    refresh() {
      if (reduce) draw(0);
    },
    destroy() {
      pause();
      removeEventListener("resize", resize);
      removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
      probes.forEach((p) => {
        p.remove();
      });
    },
  };
}
