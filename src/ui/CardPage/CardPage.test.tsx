import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CardPage, FormFields } from "./CardPage";

describe("CardPage", () => {
  it("frames a screen with its title, a line under it and its content", () => {
    render(
      <CardPage title="Join a room" subtitle="One more step.">
        <FormFields>
          <p>Body</p>
        </FormFields>
      </CardPage>,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Join a room" })).toBeInTheDocument();
    expect(screen.getByText("One more step.")).toBeInTheDocument();
    expect(screen.getByText("Body")).toBeInTheDocument();
  });

  it("shows the piece above the card and what leads the card", () => {
    const { container } = render(
      <CardPage title="Welcome back" art="dice" lead={<p>NOVA-7Q</p>}>
        <p>Body</p>
      </CardPage>,
    );
    expect(container.querySelector("svg")).toBeInTheDocument();
    expect(screen.getByText("NOVA-7Q")).toBeInTheDocument();
  });

  it("has no piece unless asked for one", () => {
    const { container } = render(
      <CardPage title="Join a room">
        <p>Body</p>
      </CardPage>,
    );
    expect(container.querySelector("svg")).toBeNull();
  });
});
