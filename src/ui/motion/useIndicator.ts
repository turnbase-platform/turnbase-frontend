import { useLayoutEffect, useState, type RefObject } from "react";

export interface Indicator {
  left: number;
  width: number;
}

/**
 * Where a sliding highlight sits: the offset box of the `selected`-th element matching `selector`
 * inside `box`, or `null` when nothing is selected. Re-measured on resize and once the pixel face
 * has loaded (it changes every label's width); `remeasureOn` names whatever else changes them.
 */
export function useIndicator(
  box: RefObject<HTMLElement | null>,
  selector: string,
  selected: number,
  remeasureOn: string,
): Indicator | null {
  const [indicator, setIndicator] = useState<Indicator | null>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const el =
        selected < 0 ? undefined : box.current?.querySelectorAll<HTMLElement>(selector)[selected];
      setIndicator(el ? { left: el.offsetLeft, width: el.offsetWidth } : null);
    };
    measure();
    addEventListener("resize", measure);
    // jsdom has no font loading API; a real browser re-measures once the pixel face has arrived.
    void (document as { fonts?: FontFaceSet }).fonts?.ready.then(measure);
    return () => {
      removeEventListener("resize", measure);
    };
  }, [box, selector, selected, remeasureOn]);

  return indicator;
}
