import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { authWrapper, fakeAuth } from "../../test/authWrapper";
import { REGISTERED } from "../../test/fakeApi";
import { GameStartProgress } from "./GameStartProgress";
import { isStartInProgress, START_FAILURE_TEXT, START_PHASE_TEXT } from "./startStatus";

const wrapper = authWrapper(fakeAuth(REGISTERED));

describe("GameStartProgress", () => {
  it("renders nothing before a start begins", () => {
    const { container } = render(<GameStartProgress status={null} showFailure />, { wrapper });
    expect(container).toBeEmptyDOMElement();
  });

  it.each(Object.entries(START_PHASE_TEXT))("shows a spinner and text for %s", (phase, text) => {
    render(
      <GameStartProgress
        status={{ phase: phase as keyof typeof START_PHASE_TEXT }}
        showFailure={false}
      />,
      { wrapper },
    );
    expect(screen.getByRole("status", { name: "Starting the game" })).toBeInTheDocument();
    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it("says why a start failed, for the participants who did not press Start", () => {
    render(
      <GameStartProgress status={{ phase: "FAILED", reason: "HOST_UNRESPONSIVE" }} showFailure />,
      { wrapper },
    );
    expect(screen.getByText(START_FAILURE_TEXT.HOST_UNRESPONSIVE)).toBeInTheDocument();
  });

  it("leaves the failure to the host's own banner", () => {
    const { container } = render(
      <GameStartProgress
        status={{ phase: "FAILED", reason: "NO_HOST_AVAILABLE" }}
        showFailure={false}
      />,
      { wrapper },
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("counts every phase but FAILED, and no status, as not in progress", () => {
    expect(isStartInProgress(null)).toBe(false);
    expect(isStartInProgress({ phase: "FAILED", reason: "NO_HOST_AVAILABLE" })).toBe(false);
    expect(isStartInProgress({ phase: "RETRYING" })).toBe(true);
  });
});
