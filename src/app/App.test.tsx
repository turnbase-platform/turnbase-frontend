import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { App } from "./App";

describe("App", () => {
  it("renders inside the Astryx Theme provider", () => {
    render(<App />);

    expect(screen.getByRole("button", { name: "TurnBase" })).toBeInTheDocument();
    // shell-architecture.md §2: the root Theme syncs `data-astryx-theme` to <html> — without
    // it, theme CSS never applies and the page silently renders Astryx's built-in defaults.
    expect(document.documentElement).toHaveAttribute("data-astryx-theme");
  });
});
