import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PillTabs, type PillTab } from "./PillTabs";

const ITEMS: PillTab[] = [
  { value: "all", label: "All friends" },
  { value: "requests", label: "Requests", end: <b>2</b> },
  { value: "blocked", label: "Blocked" },
];

function Harness({ onChange }: { onChange?: (value: string) => void }) {
  const [value, setValue] = useState("all");
  return (
    <PillTabs
      label="Friends"
      value={value}
      items={ITEMS}
      onChange={(v) => {
        setValue(v);
        onChange?.(v);
      }}
    />
  );
}

describe("PillTabs", () => {
  it("is a named tablist whose selected tab is the only tab stop", () => {
    render(<Harness />);
    expect(screen.getByRole("tablist", { name: "Friends" })).toBeInTheDocument();
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((t) => t.getAttribute("aria-selected"))).toEqual(["true", "false", "false"]);
    expect(tabs.map((t) => t.tabIndex)).toEqual([0, -1, -1]);
  });

  it("names a tab by its label and renders its end adornment", () => {
    render(<Harness />);
    expect(screen.getByRole("tab", { name: "Requests 2" })).toBeInTheDocument();
  });

  it("spans its container when asked", () => {
    render(
      <PillTabs
        block
        label="Sections"
        value="a"
        items={[{ value: "a", label: "A" }]}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("tablist")).toHaveAttribute("data-block", "true");
  });

  it("selects on click", async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await userEvent.click(screen.getByRole("tab", { name: "Blocked" }));
    expect(onChange).toHaveBeenCalledWith("blocked");
    expect(screen.getByRole("tab", { name: "Blocked" })).toHaveAttribute("aria-selected", "true");
  });

  it("moves selection and focus with the arrow keys, wrapping at both ends", async () => {
    render(<Harness />);
    screen.getByRole("tab", { name: "All friends" }).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: /Requests/ })).toHaveFocus();
    await userEvent.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "Blocked" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "Blocked" })).toHaveAttribute("aria-selected", "true");
  });

  it("jumps to the first and last tab with Home and End", async () => {
    render(<Harness />);
    screen.getByRole("tab", { name: "All friends" }).focus();
    await userEvent.keyboard("{End}");
    expect(screen.getByRole("tab", { name: "Blocked" })).toHaveFocus();
    await userEvent.keyboard("{Home}");
    expect(screen.getByRole("tab", { name: "All friends" })).toHaveFocus();
  });

  it("points the selected tab at its panel when one is named", () => {
    render(
      <PillTabs
        label="Friends"
        value="all"
        items={ITEMS}
        panelId="friends-panel"
        onChange={() => undefined}
      />,
    );
    expect(screen.getByRole("tab", { name: "All friends" })).toHaveAttribute(
      "aria-controls",
      "friends-panel",
    );
    expect(screen.getByRole("tab", { name: "Blocked" })).not.toHaveAttribute("aria-controls");
  });
});
