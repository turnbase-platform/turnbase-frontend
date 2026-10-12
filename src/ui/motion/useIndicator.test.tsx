import { describe, expect, it } from "vitest";
import { act, render } from "@testing-library/react";
import { useRef } from "react";
import { useIndicator } from "./useIndicator";

function Probe({ selected }: { selected: number }) {
  const box = useRef<HTMLDivElement>(null);
  const indicator = useIndicator(box, ".item", selected, "a|b");
  return (
    <div ref={box}>
      <span className="item">a</span>
      <span className="item">b</span>
      <output>{indicator ? `${String(indicator.left)}:${String(indicator.width)}` : "none"}</output>
    </div>
  );
}

function sized(el: Element, left: number, width: number) {
  Object.defineProperty(el, "offsetLeft", { configurable: true, value: left });
  Object.defineProperty(el, "offsetWidth", { configurable: true, value: width });
}

describe("useIndicator", () => {
  it("is null when nothing is selected", () => {
    const { container } = render(<Probe selected={-1} />);
    expect(container.querySelector("output")?.textContent).toBe("none");
  });

  it("sits on the selected element's offset box", () => {
    const { container, rerender } = render(<Probe selected={0} />);
    const [a, b] = Array.from(container.querySelectorAll(".item"));
    sized(a, 4, 40);
    sized(b, 50, 60);
    rerender(<Probe selected={1} />);
    expect(container.querySelector("output")?.textContent).toBe("50:60");
  });

  it("re-measures when the window resizes", () => {
    const { container } = render(<Probe selected={0} />);
    sized(container.querySelectorAll(".item")[0], 8, 70);
    act(() => {
      dispatchEvent(new Event("resize"));
    });
    expect(container.querySelector("output")?.textContent).toBe("8:70");
  });
});
