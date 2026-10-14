import { useLayoutEffect, useRef, type ReactNode } from "react";

const FOCUSABLE = "a[href],button,input,select,textarea,summary,[tabindex]";

/**
 * Sample content that illustrates the copy beside it (the landing's pictures): hidden from
 * assistive technology and out of the tab order, yet still under the pointer, so the hover
 * effects (spotlight, lit edge, tilt) work on what it holds. `inert` would do the first two but
 * also makes the subtree invisible to hit-testing, which kills the third.
 */
export function Specimen({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    ref.current?.querySelectorAll(FOCUSABLE).forEach((node) => {
      node.setAttribute("tabindex", "-1");
    });
  });
  return (
    <div ref={ref} aria-hidden="true" data-specimen style={{ display: "contents" }}>
      {children}
    </div>
  );
}
