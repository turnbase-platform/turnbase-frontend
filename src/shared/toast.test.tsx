import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastViewport, useToast } from "@astryxdesign/core/Toast";
import { describe, expect, it } from "vitest";

function Copy() {
  const showToast = useToast();
  return (
    <button
      type="button"
      onClick={() => {
        showToast({ type: "info", body: "Invite link copied." });
      }}
    >
      copy
    </button>
  );
}

describe("a toast (IMP-M9-08, CA-09)", () => {
  it("is announced by exactly one live region, and shown once", async () => {
    render(
      <ToastViewport>
        <Copy />
      </ToastViewport>,
    );
    await userEvent.click(screen.getByRole("button", { name: "copy" }));

    const copies = screen.getAllByText("Invite link copied.");
    // Astryx mirrors the text into one visually-hidden singleton live region (the announcement);
    // the other copy is the toast itself. Nothing else may repeat it.
    const announced = copies.filter((node) => node.closest("[data-astryx-live-region]"));
    expect(announced).toHaveLength(1);
    expect(copies.filter((node) => !node.closest("[data-astryx-live-region]"))).toHaveLength(1);
  });
});
