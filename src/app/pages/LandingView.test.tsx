import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LinkProvider } from "@astryxdesign/core/Link";
import { Link } from "react-router";
import { GUEST } from "../../test/fakeApi";
import { authWrapper, fakeAuth } from "../../test/authWrapper";
import { TourProvider } from "../../features/onboarding/TourProvider";
import { useTour } from "../../features/onboarding/useTour";
import { LandingView } from "./LandingView";
import { useLandingPage } from "./useLandingPage";

afterEach(cleanup);

function show(showActions: boolean, onTour = vi.fn()) {
  const Wrapper = authWrapper(fakeAuth());
  render(
    <Wrapper>
      <LinkProvider component={Link}>
        <LandingView
          showActions={showActions}
          guest={<button type="button">Play as Guest</button>}
          appearance={<div>Appearance switch</div>}
          onTour={onTour}
        />
      </LinkProvider>
    </Wrapper>,
  );
  return onTour;
}

describe("LandingView (VW-LAND-001…004)", () => {
  it("shows the three calls to action when asked to", () => {
    show(true);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Pull up a chair.");
    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login");
    expect(screen.getAllByRole("link", { name: "Create account" })[0]).toHaveAttribute(
      "href",
      "/register",
    );
    expect(screen.getAllByRole("button", { name: "Play as Guest" }).length).toBeGreaterThan(0);
  });

  it("removes them, keeping the description, when not", () => {
    show(false);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Log in" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Create account" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Play as Guest" })).toBeNull();
    expect(screen.getAllByRole("link", { name: "Browse games" })[0]).toHaveAttribute(
      "href",
      "/games",
    );
  });

  it("has the five screens, each reachable from the rail", () => {
    show(false);
    const rail = screen.getByRole("navigation", { name: "Landing sections" });
    const names = ["Welcome", "Play together", "The library", "Build a game", "Join"];
    for (const name of names) {
      expect(rail).toHaveTextContent(name);
    }
    for (const id of ["start", "share", "library", "build", "join"]) {
      expect(document.getElementById(id)).not.toBeNull();
    }
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(4);
  });

  it("opens the tour from 'See how it works'", async () => {
    const onTour = show(false);
    await userEvent.click(screen.getByRole("button", { name: "See how it works" }));
    expect(onTour).toHaveBeenCalledOnce();
  });

  it("puts the appearance switch and the SDK link in the footer", () => {
    show(false);
    expect(screen.getByText("Appearance switch")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "SDK docs" })).toHaveAttribute(
      "href",
      "https://github.com/turnbase-platform/turnbase-sdk",
    );
  });

  it("hides the sample pictures from assistive technology and keeps them out of the tab order", () => {
    show(true);
    const pictures = document.querySelectorAll('[aria-hidden="true"][inert]');
    expect(pictures.length).toBe(3);
    expect(screen.queryByRole("button", { name: "Invite" })).toBeNull();
  });

  it("keeps the code windows readable and focusable", () => {
    show(false);
    expect(screen.getByText("MyGame.java")).toBeInTheDocument();
    expect(document.querySelectorAll("pre[tabindex='0']")).toHaveLength(2);
  });
});

describe("useLandingPage", () => {
  it("offers the actions to Unauth only", () => {
    const anon = renderHook(() => useLandingPage(), { wrapper: authWrapper(fakeAuth()) });
    expect(anon.result.current.showActions).toBe(true);
    const guest = renderHook(() => useLandingPage(), { wrapper: authWrapper(fakeAuth(GUEST)) });
    expect(guest.result.current.showActions).toBe(false);
  });

  it("opens the quick tour", () => {
    const Wrapper = authWrapper(fakeAuth());
    const { result } = renderHook(() => ({ page: useLandingPage(), tour: useTour() }), {
      wrapper: ({ children }) => (
        <Wrapper>
          <TourProvider>{children}</TourProvider>
        </Wrapper>
      ),
    });
    act(() => {
      result.current.page.openTour();
    });
    expect(result.current.tour.isOpen).toBe(true);
  });
});
