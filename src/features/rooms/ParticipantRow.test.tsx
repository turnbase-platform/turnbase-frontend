import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ParticipantRow } from "./ParticipantRow";

describe("ParticipantRow", () => {
  it("shows the name with its badges and actions, and no presence indicator", () => {
    const { container } = render(
      <ul>
        <ParticipantRow name="alice" badges={<span>Host</span>} actions={<button>Kick</button>} />
      </ul>,
    );
    expect(screen.getByRole("listitem")).toHaveTextContent("alice");
    expect(screen.getByText("Host")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Kick" })).toBeTruthy();
    expect(container.querySelector("[data-status]")).toBeNull();
  });

  it("marks the viewer's own seat, and offers no controls when there are none", () => {
    render(
      <ul>
        <ParticipantRow name="sam" you />
      </ul>,
    );
    expect(screen.getByRole("listitem")).toHaveTextContent("(you)");
    expect(screen.queryByRole("button")).toBeNull();
  });
});
