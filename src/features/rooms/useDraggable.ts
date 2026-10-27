import { useCallback, useEffect, useState, type KeyboardEvent, type PointerEvent } from "react";

export interface Point {
  x: number;
  y: number;
}

/** Keeps a box of `size` wholly inside the viewport, `margin` from its edges. */
export function clampToViewport(
  point: Point,
  size: { width: number; height: number },
  viewport: { width: number; height: number },
  margin = 8,
): Point {
  const maxX = Math.max(margin, viewport.width - size.width - margin);
  const maxY = Math.max(margin, viewport.height - size.height - margin);
  return {
    x: Math.min(Math.max(point.x, margin), maxX),
    y: Math.min(Math.max(point.y, margin), maxY),
  };
}

const KEY_STEP = 16;
const KEY_STEP_LARGE = 64;
const ARROWS: Partial<Record<string, Point>> = {
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
};

/**
 * A box the user moves by its handle (`immersive-room.md` §2.4): pointer drag, or the arrow keys
 * while the handle is focused. `position` is `null` until the first move, so the box rests where its
 * stylesheet puts it; it never leaves the viewport, including after the window is resized.
 */
export function useDraggable(box: React.RefObject<HTMLElement | null>) {
  const [position, setPosition] = useState<Point | null>(null);
  const [grab, setGrab] = useState<Point | null>(null);

  const place = useCallback(
    (point: Point) => {
      const element = box.current;
      if (!element) return;
      setPosition(
        clampToViewport(
          point,
          { width: element.offsetWidth, height: element.offsetHeight },
          { width: window.innerWidth, height: window.innerHeight },
        ),
      );
    },
    [box],
  );

  const current = useCallback((): Point | null => {
    const element = box.current;
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    return { x: rect.left, y: rect.top };
  }, [box]);

  useEffect(() => {
    if (position === null) return;
    const onResize = () => {
      place(position);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, [position, place]);

  const handle = {
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      if (event.button !== 0 || (event.target as HTMLElement).closest("button")) return;
      const at = current();
      if (!at) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      setGrab({ x: event.clientX - at.x, y: event.clientY - at.y });
    },
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      if (grab) place({ x: event.clientX - grab.x, y: event.clientY - grab.y });
    },
    onPointerUp: (event: PointerEvent<HTMLElement>) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      setGrab(null);
    },
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      const arrow = ARROWS[event.key];
      const at = position ?? current();
      if (!arrow || !at) return;
      event.preventDefault();
      const step = event.shiftKey ? KEY_STEP_LARGE : KEY_STEP;
      place({ x: at.x + arrow.x * step, y: at.y + arrow.y * step });
    },
  };

  return { position, dragging: grab !== null, handle };
}
