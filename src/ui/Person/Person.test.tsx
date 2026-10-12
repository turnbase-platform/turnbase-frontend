import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Person } from "./Person";

describe("Person", () => {
  it("shows the person and no presence", () => {
    render(<Person name="Nova" />);
    expect(screen.getByLabelText("Nova")).toBeTruthy();
    expect(screen.queryByLabelText(/online|offline|away/i)).toBeNull();
  });
});
