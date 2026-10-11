import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SectionCard } from "./SectionCard";

describe("SectionCard", () => {
  it("titles its content with a level-2 heading", () => {
    render(<SectionCard title="Statistics">body</SectionCard>);
    expect(screen.getByRole("heading", { level: 2, name: "Statistics" })).toBeTruthy();
    expect(screen.getByText("body")).toBeTruthy();
  });
});
