import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { Specimen } from "./Specimen";

describe("Specimen", () => {
  it("hides its content from assistive technology and takes every control out of the tab order", () => {
    const { container } = render(
      <Specimen>
        <button>Invite</button>
        <a href="/x">link</a>
        <pre tabIndex={0}>code</pre>
      </Specimen>,
    );
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
    const tabbable = container.querySelectorAll("button,a,pre");
    expect(tabbable).toHaveLength(3);
    tabbable.forEach((node) => {
      expect(node.getAttribute("tabindex")).toBe("-1");
    });
  });

  it("is not inert, so the pointer effects still reach what it holds", () => {
    const { container } = render(<Specimen>x</Specimen>);
    expect(container.querySelector("[inert]")).toBeNull();
  });
});
