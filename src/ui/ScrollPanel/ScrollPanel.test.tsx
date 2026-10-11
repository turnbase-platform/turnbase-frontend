import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ScrollPanel } from "./ScrollPanel";

describe("ScrollPanel", () => {
  it("is a named region around its rows", () => {
    render(
      <ScrollPanel label="Games">
        <p>row</p>
      </ScrollPanel>,
    );
    expect(screen.getByRole("region", { name: "Games" })).toHaveTextContent("row");
  });

  it("is reachable by keyboard so a long list can be scrolled without a pointer", async () => {
    render(
      <>
        <button type="button">before</button>
        <ScrollPanel label="Games">
          <p>row</p>
        </ScrollPanel>
      </>,
    );
    await userEvent.tab();
    await userEvent.tab();
    expect(screen.getByRole("region", { name: "Games" })).toHaveFocus();
  });

  it("is not a card: it carries no glass class for the pointer effects to light", () => {
    const { container } = render(<ScrollPanel label="Games">x</ScrollPanel>);
    expect(container.querySelector(".tb-glass, .astryx-card, [data-fx], [data-tilt]")).toBeNull();
  });
});
