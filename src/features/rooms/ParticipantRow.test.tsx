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
    expect(screen.getByText("alice")).toBeTruthy();
    expect(screen.getByText("Host")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Kick" })).toBeTruthy();
    expect(container.querySelector("[data-status]")).toBeNull();
  });

  it("omits the action area when there are no actions", () => {
    render(
      <ul>
        <ParticipantRow name="sam" />
      </ul>,
    );
    expect(screen.getByRole("listitem").children).toHaveLength(1);
  });
});
