import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { initPointerEffects, usePointerEffects } from "./pointerEffects";

// The delegation sets CSS custom properties from one pointer listener; the glass in surfaces.css
// and the tilt in the card modules read them. It is a no-op under prefers-reduced-motion.

const RECT = { left: 10, top: 20, width: 200, height: 100 } as DOMRect;

function reduced(on: boolean) {
  vi.stubGlobal("matchMedia", () => ({ matches: on }));
}

function target(attrs: Record<string, string> = {}) {
  const el = document.createElement("div");
  el.className = "tb-glass";
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  el.getBoundingClientRect = () => RECT;
  document.body.append(el);
  return el;
}

function move(el: Element, clientX: number, clientY: number) {
  el.dispatchEvent(new MouseEvent("pointermove", { clientX, clientY, bubbles: true }));
  vi.advanceTimersByTime(20);
}

const root = document.documentElement;

beforeEach(() => {
  vi.useFakeTimers();
  reduced(false);
  vi.stubGlobal("innerWidth", 1000);
  vi.stubGlobal("innerHeight", 500);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.replaceChildren();
  root.removeAttribute("style");
});

describe("initPointerEffects", () => {
  it("writes the pointer position relative to a spotlight target", () => {
    const stop = initPointerEffects();
    const el = target();
    move(el, 60, 70);
    expect(el.style.getPropertyValue("--mx")).toBe("50px");
    expect(el.style.getPropertyValue("--my")).toBe("50px");
    stop();
  });

  it("also lights an opt-in [data-fx] element and ignores plain ones", () => {
    const stop = initPointerEffects();
    const lit = target({ "data-fx": "" });
    lit.className = "";
    const plain = document.createElement("div");
    plain.getBoundingClientRect = () => RECT;
    document.body.append(plain);
    move(lit, 60, 70);
    expect(lit.style.getPropertyValue("--mx")).toBe("50px");
    move(plain, 60, 70);
    expect(plain.style.getPropertyValue("--mx")).toBe("");
    stop();
  });

  it("publishes the normalised pointer and scroll position on the root", () => {
    const stop = initPointerEffects();
    move(target(), 500, 250);
    expect(root.style.getPropertyValue("--px")).toBe("0.000");
    expect(root.style.getPropertyValue("--py")).toBe("0.000");
    move(target(), 1000, 0);
    expect(root.style.getPropertyValue("--px")).toBe("1.000");
    expect(root.style.getPropertyValue("--py")).toBe("-1.000");
    vi.stubGlobal("scrollY", 120);
    dispatchEvent(new Event("scroll"));
    expect(root.style.getPropertyValue("--sy")).toBe("120");
    stop();
  });

  it("tilts a [data-tilt] element towards the pointer and flags it active", () => {
    const stop = initPointerEffects();
    const el = target({ "data-tilt": "10" });
    move(el, 10 + 200, 20 + 50); // right edge, vertical middle
    expect(el.style.getPropertyValue("--ry")).toBe("10.00deg");
    expect(el.style.getPropertyValue("--rx")).toBe("0.00deg");
    expect(el.getAttribute("data-active")).toBe("true");
    stop();
  });

  it("resets the tilt when the pointer moves to something else", () => {
    const stop = initPointerEffects();
    const el = target({ "data-tilt": "" });
    const other = target();
    move(el, 150, 40);
    expect(el.getAttribute("data-active")).toBe("true");
    move(other, 150, 40);
    expect(el.getAttribute("data-active")).toBeNull();
    expect(el.style.getPropertyValue("--rx")).toBe("0deg");
    expect(el.style.getPropertyValue("--ry")).toBe("0deg");
    stop();
  });

  it("does nothing at all under prefers-reduced-motion", () => {
    reduced(true);
    const add = vi.spyOn(window, "addEventListener");
    const stop = initPointerEffects();
    const el = target({ "data-tilt": "" });
    move(el, 60, 70);
    expect(add).not.toHaveBeenCalledWith("pointermove", expect.anything(), expect.anything());
    expect(el.style.getPropertyValue("--mx")).toBe("");
    expect(root.style.getPropertyValue("--px")).toBe("");
    expect(() => {
      stop();
    }).not.toThrow();
  });

  it("stops listening when torn down", () => {
    const stop = initPointerEffects();
    stop();
    const el = target();
    move(el, 60, 70);
    expect(el.style.getPropertyValue("--mx")).toBe("");
  });
});

describe("usePointerEffects", () => {
  function Probe() {
    usePointerEffects();
    return null;
  }

  it("runs while mounted and stops on unmount", () => {
    const view = render(<Probe />);
    const el = target();
    move(el, 60, 70);
    expect(el.style.getPropertyValue("--mx")).toBe("50px");
    view.unmount();
    move(el, 100, 70);
    expect(el.style.getPropertyValue("--mx")).toBe("50px");
  });
});
