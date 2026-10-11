import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SortControl } from "./SortControl";
import { formatSort, parseSort } from "./sort";

const FIELDS = { title: "Name", createdAt: "Created" } as const;

describe("parseSort / formatSort", () => {
  it("round-trips the wire form field,dir", () => {
    expect(parseSort("title,asc")).toEqual({ field: "title", direction: "asc" });
    expect(parseSort("createdAt,desc")).toEqual({ field: "createdAt", direction: "desc" });
    expect(formatSort("title", "desc")).toBe("title,desc");
  });

  it("treats a missing direction as ascending, the API default", () => {
    expect(parseSort("title")).toEqual({ field: "title", direction: "asc" });
  });
});

describe("SortControl", () => {
  it("shows the current field and names the direction toggle after what it will do", () => {
    render(<SortControl fields={FIELDS} sort="createdAt,desc" onChange={() => undefined} />);
    expect(screen.getByRole("combobox", { name: "Sort by" })).toHaveTextContent("Created");
    expect(
      screen.getByRole("button", { name: "Descending. Switch to ascending" }),
    ).toBeInTheDocument();
  });

  it("flips only the direction, emitting field,dir", async () => {
    const onChange = vi.fn();
    render(<SortControl fields={FIELDS} sort="createdAt,desc" onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Descending. Switch to ascending" }));
    expect(onChange).toHaveBeenCalledWith("createdAt,asc");
  });

  it("reads the toggle the other way round when ascending", async () => {
    const onChange = vi.fn();
    render(<SortControl fields={FIELDS} sort="title,asc" onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Ascending. Switch to descending" }));
    expect(onChange).toHaveBeenCalledWith("title,desc");
  });

  it("changes the field and keeps the direction", async () => {
    const onChange = vi.fn();
    render(<SortControl fields={FIELDS} sort="createdAt,desc" onChange={onChange} />);
    await userEvent.click(screen.getByRole("combobox", { name: "Sort by" }));
    await userEvent.click(await screen.findByRole("option", { name: "Name" }));
    expect(onChange).toHaveBeenCalledWith("title,desc");
  });

  it("disables the direction toggle for a field the server orders one way only", () => {
    render(
      <SortControl
        fields={{ newest: "Newest", ...FIELDS }}
        fixed={["newest"]}
        sort="newest,desc"
        onChange={() => undefined}
      />,
    );
    expect(screen.getByRole("button", { name: /Switch to ascending/ })).toBeDisabled();
  });

  it("is controlled: a new prop is what it shows", () => {
    const { rerender } = render(
      <SortControl fields={FIELDS} sort="createdAt,desc" onChange={() => undefined} />,
    );
    rerender(<SortControl fields={FIELDS} sort="title,asc" onChange={() => undefined} />);
    expect(screen.getByRole("combobox", { name: "Sort by" })).toHaveTextContent("Name");
  });
});
