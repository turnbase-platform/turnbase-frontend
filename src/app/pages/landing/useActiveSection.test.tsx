import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, renderHook } from "@testing-library/react";
import { JumpMap } from "./JumpMap";
import { useActiveSection } from "./useActiveSection";

type Callback = (entries: Partial<IntersectionObserverEntry>[]) => void;
let callback: Callback = () => undefined;
const observed: string[] = [];
const scrolled = vi.fn<() => void>();
const disconnect = vi.fn<() => void>();

beforeEach(() => {
  observed.length = 0;
  disconnect.mockClear();
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(cb: Callback) {
        callback = cb;
      }
      observe(element: Element) {
        observed.push(element.id);
      }
      disconnect = disconnect;
    },
  );
  for (const id of ["start", "share", "library", "build", "join"]) {
    const section = document.createElement("section");
    section.id = id;
    section.scrollIntoView = scrolled;
    document.body.append(section);
  }
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

describe("useActiveSection", () => {
  it("starts on the first id and follows the section that crosses the middle", () => {
    const { result } = renderHook(() => useActiveSection(["start", "share"]));
    expect(result.current).toBe("start");
    expect(observed).toEqual(["start", "share"]);
    act(() => {
      callback([{ isIntersecting: true, target: document.getElementById("share") as Element }]);
    });
    expect(result.current).toBe("share");
    act(() => {
      callback([{ isIntersecting: false, target: document.getElementById("start") as Element }]);
    });
    expect(result.current).toBe("share");
  });

  it("stops observing on unmount", () => {
    const { unmount } = renderHook(() => useActiveSection(["start"]));
    unmount();
    expect(disconnect).toHaveBeenCalled();
  });

  it("does nothing where there is no observer", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const { result } = renderHook(() => useActiveSection(["start", "share"]));
    expect(result.current).toBe("start");
  });
});

describe("JumpMap", () => {
  it("marks the current screen and scrolls to the one clicked", () => {
    render(<JumpMap />);
    const links = document.querySelectorAll("nav[aria-label='Landing sections'] a");
    expect(links).toHaveLength(5);
    expect(links[0]).toHaveAttribute("aria-current", "true");
    expect(links[1]).not.toHaveAttribute("aria-current");
    (links[2] as HTMLElement).click();
    expect(scrolled).toHaveBeenCalled();
  });
});
