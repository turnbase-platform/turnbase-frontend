import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Logo } from "./Logo";

describe("Logo", () => {
  it("is decorative by default, because the wordmark beside it names the product", () => {
    const { container } = render(<Logo />);
    expect(container.querySelector("[aria-hidden='true']")).not.toBeNull();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("is a named image when it stands alone", () => {
    render(<Logo title="TurnBase" />);
    expect(screen.getByRole("img", { name: "TurnBase" })).toBeInTheDocument();
  });

  it("takes its size in pixels", () => {
    const { container } = render(<Logo size={40} />);
    const box = container.firstElementChild as HTMLElement;
    expect(box.style.getPropertyValue("--logo-size")).toBe("40px");
  });
});
