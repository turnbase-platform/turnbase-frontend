import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { Backdrop } from "./Backdrop";

afterEach(cleanup);

describe("Backdrop", () => {
  it("renders the sky, hidden from assistive technology", () => {
    const { container } = render(<Backdrop />);
    const sky = container.querySelector("canvas")?.parentElement;
    expect(sky).toHaveAttribute("aria-hidden", "true");
  });

  it("switches the pointer effects off again on unmount", () => {
    const { unmount } = render(<Backdrop />);
    unmount();
    expect(document.documentElement.style.getPropertyValue("--px")).toBe("");
  });
});
