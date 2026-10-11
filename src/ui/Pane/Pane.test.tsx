import { describe, expect, it } from "vitest";
import { render, renderHook } from "@testing-library/react";
import { directionBetween, useDirection } from "./direction";
import { Pane } from "./Pane";

const SECTIONS = ["/games", "/rooms", "/friends"] as const;

describe("directionBetween", () => {
  it("moves forward across sections to the right of the current one", () => {
    expect(directionBetween("/games", "/rooms", SECTIONS)).toBe("fwd");
  });

  it("moves back across sections to the left", () => {
    expect(directionBetween("/friends", "/games", SECTIONS)).toBe("back");
  });

  it("goes forward when a route gets deeper inside one section", () => {
    expect(directionBetween("/games", "/games/tictactoe", SECTIONS)).toBe("fwd");
  });

  it("goes back when a route gets shallower inside one section", () => {
    expect(directionBetween("/games/tictactoe", "/games", SECTIONS)).toBe("back");
  });

  it("rises when nothing orders the two routes", () => {
    expect(directionBetween("/games", "/games", SECTIONS)).toBe("up");
    expect(directionBetween("/login", "/register", SECTIONS)).toBe("up");
    expect(directionBetween("/games", "/profile", SECTIONS)).toBe("up");
  });
});

describe("useDirection", () => {
  it("starts rising, then follows the route change", () => {
    const { result, rerender } = renderHook(({ path }) => useDirection(path, SECTIONS), {
      initialProps: { path: "/games" },
    });
    expect(result.current).toBe("up");
    rerender({ path: "/rooms" });
    expect(result.current).toBe("fwd");
    rerender({ path: "/games" });
    expect(result.current).toBe("back");
  });
});

describe("Pane", () => {
  it("carries the direction and its children", () => {
    const { container } = render(
      <Pane id="a" direction="fwd">
        <p>content</p>
      </Pane>,
    );
    const pane = container.firstElementChild;
    expect(pane?.getAttribute("data-direction")).toBe("fwd");
    expect(pane?.textContent).toBe("content");
  });

  it("remounts its subtree when the key changes, so the entrance replays", () => {
    function Counter() {
      return <input data-testid="field" />;
    }
    const { rerender, getByTestId } = render(
      <Pane id="a">
        <Counter />
      </Pane>,
    );
    const first = getByTestId("field");
    rerender(
      <Pane id="a">
        <Counter />
      </Pane>,
    );
    expect(getByTestId("field")).toBe(first);
    rerender(
      <Pane id="b">
        <Counter />
      </Pane>,
    );
    expect(getByTestId("field")).not.toBe(first);
  });
});
