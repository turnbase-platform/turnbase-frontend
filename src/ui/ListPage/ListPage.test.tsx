import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ListPage } from "./ListPage";

describe("ListPage", () => {
  it("gives the page its one h1, an optional line under it, the toolbar and the body", () => {
    render(
      <ListPage title="Games" subtitle="Pick one." toolbar={<input aria-label="Search" />}>
        <p>rows</p>
      </ListPage>,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Games" })).toBeInTheDocument();
    expect(screen.getByText("Pick one.")).toBeInTheDocument();
    expect(screen.getByLabelText("Search")).toBeInTheDocument();
    expect(screen.getByText("rows")).toBeInTheDocument();
  });

  it("renders without a subtitle or a toolbar", () => {
    render(
      <ListPage title="Rooms">
        <p>rows</p>
      </ListPage>,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Rooms" })).toBeInTheDocument();
  });
});
