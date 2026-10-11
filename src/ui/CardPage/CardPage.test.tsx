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
});
