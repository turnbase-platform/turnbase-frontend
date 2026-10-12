import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { Row, Stack } from "./Layout";

describe("Stack and Row", () => {
  it("carry their gap as data and render the requested element", () => {
    const { container } = render(
      <Stack gap={3} as="section">
        <Row gap={2} between nowrap>
          x
        </Row>
      </Stack>,
    );
    const stack = container.firstElementChild;
    expect(stack?.tagName).toBe("SECTION");
    expect(stack).toHaveAttribute("data-gap", "3");
    const row = stack?.firstElementChild;
    expect(row).toHaveAttribute("data-gap", "2");
    expect(row).toHaveAttribute("data-between", "true");
    expect(row).toHaveAttribute("data-nowrap", "true");
    expect(row).not.toHaveAttribute("data-end");
  });
});
