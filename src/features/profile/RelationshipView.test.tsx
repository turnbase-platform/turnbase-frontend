import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { RelationshipView } from "./RelationshipView";
import type { Relationship } from "./useRelationship";

const view = (state: Relationship["state"]) => {
  const relationship = { state, isBusy: false, add: vi.fn(), remove: vi.fn() };
  render(
    <MemoryRouter>
      <RelationshipView relationship={relationship} />
    </MemoryRouter>,
  );
  return relationship;
};

describe("RelationshipView", () => {
  it("offers Add friend when there is no relationship", async () => {
    const relationship = view("NONE");
    await userEvent.click(screen.getByRole("button", { name: "Add friend" }));
    expect(relationship.add).toHaveBeenCalled();
  });

  it("offers Remove friend to friends", async () => {
    const relationship = view("FRIENDS");
    await userEvent.click(screen.getByRole("button", { name: "Remove friend" }));
    expect(relationship.remove).toHaveBeenCalled();
  });

  it("says a sent request is pending", () => {
    view("REQUEST_SENT");
    expect(screen.getByText("Friend request sent.")).toBeTruthy();
  });

  it("points a received request at the friends page", () => {
    view("REQUEST_RECEIVED");
    expect(screen.getByRole("link", { name: "your friends page" }).getAttribute("href")).toBe(
      "/friends",
    );
  });
});
