import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppearanceView } from "./AppearanceView";
import type { AppearanceSettings } from "./useAppearanceSettings";

const settings = (over: Partial<AppearanceSettings> = {}): AppearanceSettings => ({
  appearance: "system",
  setAppearance: vi.fn(),
  cursorEffects: true,
  reduceMotion: false,
  setCursorEffects: vi.fn(),
  setReduceMotion: vi.fn(),
  ...over,
});

describe("AppearanceView", () => {
  it("shows the chosen theme and offers Light, Dark and Auto", async () => {
    const state = settings();
    render(<AppearanceView settings={state} />);
    expect(screen.getByRole("radio", { name: "Auto" })).toBeChecked();
    await userEvent.click(screen.getByRole("radio", { name: "Dark" }));
    expect(state.setAppearance).toHaveBeenCalledWith("dark");
  });

  it("switches cursor effects off and Reduce motion on", async () => {
    const state = settings();
    render(<AppearanceView settings={state} />);
    const effects = screen.getByRole("switch", { name: "Cursor effects" });
    expect(effects).toBeChecked();
    await userEvent.click(effects);
    expect(state.setCursorEffects).toHaveBeenCalledWith(false);
    const reduce = screen.getByRole("switch", { name: "Reduce motion" });
    expect(reduce).not.toBeChecked();
    await userEvent.click(reduce);
    expect(state.setReduceMotion).toHaveBeenCalledWith(true);
  });

  it("says the choices stay in this browser", () => {
    render(<AppearanceView settings={settings()} />);
    expect(screen.getByText("These choices are saved in this browser only.")).toBeVisible();
  });
});
