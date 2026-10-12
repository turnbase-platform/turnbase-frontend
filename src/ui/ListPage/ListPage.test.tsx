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

  it("places the actions and the aside beside the list when there is an aside", () => {
    render(
      <ListPage title="Rooms" actions={<button>Create</button>} aside={<p>code panel</p>}>
        <p>rows</p>
      </ListPage>,
    );
    expect(screen.getByRole("button", { name: "Create" })).toBeInTheDocument();
    expect(screen.getByText("code panel").closest("aside")).not.toBeNull();
  });

  it("leaves the actions out without an aside to sit over", () => {
    render(
      <ListPage title="Rooms" actions={<button>Create</button>}>
        <p>rows</p>
      </ListPage>,
    );
    expect(screen.queryByRole("button", { name: "Create" })).toBeNull();
  });
});
