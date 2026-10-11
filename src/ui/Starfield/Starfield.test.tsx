import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { Starfield } from "./Starfield";

// jsdom has no canvas. A recording context is enough to observe what the engine does with time:
// how many frames it draws and whether it keeps asking for more.

let frames = 0;
const ctx = new Proxy(
  {},
  {
    get: (_t, key) => {
      if (key === "createLinearGradient") return () => ({ addColorStop: () => undefined });
      if (key === "clearRect") return () => (frames += 1);
      return () => undefined;
    },
    set: () => true,
  },
);

function reduced(on: boolean) {
  vi.stubGlobal("matchMedia", () => ({
    matches: on,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

function setHidden(hidden: boolean) {
  Object.defineProperty(document, "hidden", { configurable: true, value: hidden });
  document.dispatchEvent(new Event("visibilitychange"));
}

beforeEach(() => {
  frames = 0;
  vi.useFakeTimers();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    ctx as unknown as CanvasRenderingContext2D,
  );
  reduced(false);
  setHidden(false);
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Starfield", () => {
  it("is decorative: hidden from assistive technology, one canvas", () => {
    const { container } = render(<Starfield />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelectorAll("canvas")).toHaveLength(1);
  });

  it("animates: it keeps drawing frames", () => {
    render(<Starfield />);
    vi.advanceTimersByTime(200);
    expect(frames).toBeGreaterThan(3);
  });

  it("is static under prefers-reduced-motion: one frame, nothing scheduled", () => {
    reduced(true);
    render(<Starfield />);
    vi.advanceTimersByTime(500);
    expect(frames).toBe(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("pauses while the tab is hidden and resumes when it is shown", () => {
    render(<Starfield />);
    vi.advanceTimersByTime(100);
    setHidden(true);
    const paused = frames;
    vi.advanceTimersByTime(500);
    expect(frames).toBe(paused);
    expect(vi.getTimerCount()).toBe(0);
    setHidden(false);
    vi.advanceTimersByTime(100);
    expect(frames).toBeGreaterThan(paused);
  });

  it("starts paused when mounted in a hidden tab", () => {
    setHidden(true);
    render(<Starfield />);
    vi.advanceTimersByTime(300);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("stops everything on unmount", () => {
    const view = render(<Starfield />);
    vi.advanceTimersByTime(100);
    view.unmount();
    const after = frames;
    vi.advanceTimersByTime(500);
    expect(frames).toBe(after);
    expect(vi.getTimerCount()).toBe(0);
    expect(document.body.querySelector("i")).toBeNull();
  });

  it("survives a browser that gives no 2d context", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    expect(() => render(<Starfield />)).not.toThrow();
  });

  it("dims on request without remounting", () => {
    const { container, rerender } = render(<Starfield dim={false} />);
    const root = container.firstElementChild;
    rerender(<Starfield dim />);
    expect(container.firstElementChild).toBe(root);
    expect(root).toHaveAttribute("data-dim", "true");
  });
});
