import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PageHead } from "./PageHead";

describe("PageHead", () => {
  it("has one level-1 heading, its subtitle and its actions", () => {
    render(
      <PageHead title="Friends" subtitle="People you play with" actions={<button>Add</button>} />,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Friends" })).toBeTruthy();
    expect(screen.getByText("People you play with")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add" })).toBeTruthy();
  });

  it("omits what it is not given", () => {
    const { container } = render(<PageHead title="Games" />);
    expect(container.querySelectorAll("button")).toHaveLength(0);
    expect(container.querySelectorAll("p")).toHaveLength(0);
  });
});
