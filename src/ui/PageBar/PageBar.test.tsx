import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PageBar } from "./PageBar";
import { pageWindow } from "./pageWindow";

const BASE = {
  size: 25,
  sizes: [10, 25, 50, 100],
  noun: "games",
  onPage: () => undefined,
  onSize: () => undefined,
};

describe("pageWindow", () => {
  it("lists every page when there are few", () => {
    expect(pageWindow(2, 3)).toEqual([1, 2, 3]);
  });

  it("keeps first, last and the neighbours of the current page, with gaps between", () => {
    expect(pageWindow(1, 10)).toEqual([1, 2, null, 10]);
    expect(pageWindow(5, 10)).toEqual([1, null, 4, 5, 6, null, 10]);
    expect(pageWindow(10, 10)).toEqual([1, null, 9, 10]);
  });

  it("does not put a gap where only one page is missing from view", () => {
    expect(pageWindow(3, 5)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("PageBar", () => {
  it("reports the range it shows, from the server's total", () => {
    render(<PageBar {...BASE} page={2} total={60} />);
    expect(screen.getByRole("navigation", { name: "games pages" })).toHaveTextContent(
      "26–50 of 60",
    );
  });

  it("clips the last page's range to the total", () => {
    render(<PageBar {...BASE} page={3} total={60} />);
    expect(screen.getByText("51–60 of 60")).toBeInTheDocument();
  });

  it("says so when there is nothing, and offers no paging", () => {
    render(<PageBar {...BASE} page={1} total={0} />);
    expect(screen.getByText("No games")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next page" })).toBeNull();
  });

  it("offers no page buttons for a single page, but still the page size", () => {
    render(<PageBar {...BASE} page={1} total={10} />);
    expect(screen.queryByRole("button", { name: "Next page" })).toBeNull();
    expect(screen.getByRole("combobox", { name: "Per page" })).toHaveTextContent("25 / page");
  });

  it("is 1-based: the previous page does not exist on page 1, the next not on the last", () => {
    const { rerender } = render(<PageBar {...BASE} page={1} total={60} />);
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next page" })).toBeEnabled();
    rerender(<PageBar {...BASE} page={3} total={60} />);
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  });

  it("marks the current page and names each page number", () => {
    render(<PageBar {...BASE} page={2} total={60} />);
    expect(screen.getByRole("button", { name: "Page 2" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "Page 1" })).not.toHaveAttribute("aria-current");
  });

  it("asks for pages and never slices anything itself", async () => {
    const onPage = vi.fn();
    render(<PageBar {...BASE} onPage={onPage} page={2} total={60} />);
    await userEvent.click(screen.getByRole("button", { name: "Next page" }));
    await userEvent.click(screen.getByRole("button", { name: "Previous page" }));
    await userEvent.click(screen.getByRole("button", { name: "Page 3" }));
    expect(onPage.mock.calls).toEqual([[3], [1], [3]]);
  });

  it("asks for a new size as a number", async () => {
    const onSize = vi.fn();
    render(<PageBar {...BASE} onSize={onSize} page={1} total={60} />);
    await userEvent.click(screen.getByRole("combobox", { name: "Per page" }));
    await userEvent.click(await screen.findByRole("option", { name: "50 / page" }));
    expect(onSize).toHaveBeenCalledWith(50);
  });
});
