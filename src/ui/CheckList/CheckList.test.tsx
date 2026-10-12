import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { CheckList } from "./CheckList";

afterEach(cleanup);

describe("CheckList", () => {
  it("lists every point", () => {
    render(<CheckList items={["One", "Two"]} />);
    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual(["One", "Two"]);
  });
});
