import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterButton } from "./FilterButton";

describe("FilterButton", () => {
  it("is plain 'Filters' with nothing applied", () => {
    render(<FilterButton open={false} count={0} onClick={() => undefined} />);
    expect(screen.getByRole("button", { name: "Filters" })).toBeInTheDocument();
  });

  it("shows how many filters apply in its name", () => {
    render(<FilterButton open={false} count={3} onClick={() => undefined} />);
    expect(screen.getByRole("button", { name: "Filters (3)" })).toBeInTheDocument();
  });

  it("is a disclosure: it reports whether the panel is open and which panel it controls", () => {
    const { rerender } = render(
      <FilterButton open={false} count={0} controls="panel" onClick={() => undefined} />,
    );
    const button = screen.getByRole("button", { name: "Filters" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button).toHaveAttribute("aria-controls", "panel");
    rerender(<FilterButton open count={0} controls="panel" onClick={() => undefined} />);
    expect(button).toHaveAttribute("aria-expanded", "true");
  });

  it("calls back on click and on Enter", async () => {
    const onClick = vi.fn();
    render(<FilterButton open={false} count={0} onClick={onClick} />);
    await userEvent.click(screen.getByRole("button"));
    screen.getByRole("button").focus();
    await userEvent.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledTimes(2);
  });
});
