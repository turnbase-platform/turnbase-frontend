import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterPanel } from "./FilterPanel";

describe("FilterPanel", () => {
  it("is a named section holding its filters", () => {
    render(
      <FilterPanel count={0} onClear={() => undefined}>
        <label>
          Min players
          <input />
        </label>
      </FilterPanel>,
    );
    expect(screen.getByRole("region", { name: "Filters" })).toContainElement(
      screen.getByLabelText("Min players"),
    );
  });

  it("says nothing applies, and offers no Clear, when the count is zero", () => {
    render(
      <FilterPanel count={0} onClear={() => undefined}>
        x
      </FilterPanel>,
    );
    expect(screen.getByText("No filters applied")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear filters" })).toBeDisabled();
  });

  it("counts filters, singular and plural", () => {
    const { rerender } = render(
      <FilterPanel count={1} onClear={() => undefined}>
        x
      </FilterPanel>,
    );
    expect(screen.getByText("1 filter applied")).toBeInTheDocument();
    rerender(
      <FilterPanel count={2} onClear={() => undefined}>
        x
      </FilterPanel>,
    );
    expect(screen.getByText("2 filters applied")).toBeInTheDocument();
  });

  it("clears on request", async () => {
    const onClear = vi.fn();
    render(
      <FilterPanel count={2} onClear={onClear}>
        x
      </FilterPanel>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(onClear).toHaveBeenCalledOnce();
  });

  it("takes the id a FilterButton points at", () => {
    render(
      <FilterPanel id="panel" count={0} onClear={() => undefined}>
        x
      </FilterPanel>,
    );
    expect(screen.getByRole("region", { name: "Filters" })).toHaveAttribute("id", "panel");
  });
});
