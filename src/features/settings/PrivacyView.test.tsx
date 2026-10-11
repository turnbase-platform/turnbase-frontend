import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PrivacyView } from "./PrivacyView";
import { ACCOUNT } from "./settingsTestKit";
import type { Privacy } from "./usePrivacy";

const state = (over: Partial<Privacy["privacy"]> = {}): Privacy => ({
  privacy: { ...ACCOUNT.privacy, ...over },
  isBusy: false,
  save: vi.fn(),
});

describe("PrivacyView", () => {
  it("names every section beside its control; only friends can be Friends only", () => {
    render(<PrivacyView privacy={state()} />);
    for (const name of ["Game history", "Statistics", "Uploaded games", "Friends list"]) {
      expect(screen.getByRole("radiogroup", { name: `${name} visibility` })).toBeVisible();
    }
    expect(screen.getAllByRole("radio", { name: "Friends only" })).toHaveLength(1);
    expect(screen.getAllByRole("radio", { name: "Hidden" })).toHaveLength(4);
  });

  it("hides the section controls for a private profile", () => {
    render(<PrivacyView privacy={state({ profilePrivate: true })} />);
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
    expect(screen.getByRole("switch", { name: "Block friend requests" })).toBeVisible();
  });

  it("saves the one field that was changed", async () => {
    const privacy = state();
    render(<PrivacyView privacy={privacy} />);
    await userEvent.click(
      screen.getAllByRole("radio", { name: "Hidden" })[1], // Statistics
    );
    expect(privacy.save).toHaveBeenCalledWith({ statsVisibility: "HIDDEN" });
    await userEvent.click(screen.getByRole("switch", { name: "Block friend requests" }));
    expect(privacy.save).toHaveBeenCalledWith({ blockFriendRequests: true });
  });
});
