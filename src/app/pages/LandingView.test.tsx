import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, renderHook, screen } from "@testing-library/react";
import { LinkProvider } from "@astryxdesign/core/Link";
import { Link } from "react-router";
import { GUEST } from "../../test/fakeApi";
import { authWrapper, fakeAuth } from "../../test/authWrapper";
import { LandingView } from "./LandingView";
import { useLandingPage } from "./useLandingPage";

afterEach(cleanup);

function show(showActions: boolean) {
  const Wrapper = authWrapper(fakeAuth());
  render(
    <Wrapper>
      <LinkProvider component={Link}>
        <LandingView
          showActions={showActions}
          guest={<button type="button">Play as Guest</button>}
        />
      </LinkProvider>
    </Wrapper>,
  );
}

describe("LandingView (VW-LAND-001…004)", () => {
  it("shows the three calls to action when asked to", () => {
    show(true);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Log in" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Register" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Play as Guest" })).toBeInTheDocument();
  });

  it("removes them, keeping the description, when not", () => {
    show(false);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Log in" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Play as Guest" })).toBeNull();
  });

  it("lists what the platform offers", () => {
    show(false);
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("decorative art is hidden from assistive technology", () => {
    show(true);
    expect(document.querySelectorAll('[aria-hidden="true"] svg').length).toBeGreaterThan(0);
  });
});

describe("useLandingPage", () => {
  it("offers the actions to Unauth only", () => {
    const anon = renderHook(() => useLandingPage(), { wrapper: authWrapper(fakeAuth()) });
    expect(anon.result.current.showActions).toBe(true);
    const guest = renderHook(() => useLandingPage(), { wrapper: authWrapper(fakeAuth(GUEST)) });
    expect(guest.result.current.showActions).toBe(false);
  });
});
