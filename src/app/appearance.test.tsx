import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Theme } from "@astryxdesign/core/theme";
import { turnbaseTheme } from "../theme/turnbase";
import { APPEARANCE_KEY, readAppearance, writeAppearance } from "./appearance";
import { AppearanceControl } from "./AppearanceControl";
import { AppearanceProvider, ThemedRoot } from "./AppearanceProvider";

// Light / Dark / Auto (ADR-0017 §1): the choice is the visitor's own, persisted in the browser,
// and a browser that refuses storage must still render — it just forgets.

function mount() {
  return render(
    <AppearanceProvider>
      <ThemedRoot theme={turnbaseTheme}>
        <AppearanceControl />
      </ThemedRoot>
    </AppearanceProvider>,
  );
}

const theme = () => document.documentElement.getAttribute("data-theme");

beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("readAppearance / writeAppearance", () => {
  it("defaults to system", () => {
    expect(readAppearance()).toBe("system");
  });

  it.each(["light", "dark", "system"] as const)("round-trips %s", (value) => {
    writeAppearance(value);
    expect(localStorage.getItem(APPEARANCE_KEY)).toBe(value);
    expect(readAppearance()).toBe(value);
  });

  it("ignores a stored value it does not recognise", () => {
    localStorage.setItem(APPEARANCE_KEY, "neon");
    expect(readAppearance()).toBe("system");
  });

  it("falls back to system when reading storage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    expect(readAppearance()).toBe("system");
  });

  it("does not throw when writing storage fails", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    expect(() => {
      writeAppearance("dark");
    }).not.toThrow();
  });
});

describe("AppearanceControl", () => {
  it("is a labelled radio group with Light, Dark and Auto", () => {
    mount();
    const group = screen.getByRole("radiogroup", { name: "Appearance" });
    expect(group).toBeInTheDocument();
    for (const name of ["Light", "Dark", "Auto"]) {
      expect(screen.getByRole("radio", { name })).toBeInTheDocument();
    }
  });

  it("starts on Auto and leaves the document without a forced scheme", () => {
    mount();
    expect(screen.getByRole("radio", { name: "Auto" })).toBeChecked();
    expect(theme()).toBeNull();
  });

  it("starts on the stored choice", () => {
    writeAppearance("dark");
    mount();
    expect(screen.getByRole("radio", { name: "Dark" })).toBeChecked();
    expect(theme()).toBe("dark");
  });

  it("switches the theme and persists the choice", async () => {
    const user = userEvent.setup();
    mount();
    await user.click(screen.getByRole("radio", { name: "Dark" }));
    expect(theme()).toBe("dark");
    expect(localStorage.getItem(APPEARANCE_KEY)).toBe("dark");
    await user.click(screen.getByRole("radio", { name: "Light" }));
    expect(theme()).toBe("light");
    await user.click(screen.getByRole("radio", { name: "Auto" }));
    expect(theme()).toBeNull();
    expect(localStorage.getItem(APPEARANCE_KEY)).toBe("system");
  });

  it("is operable from the keyboard", async () => {
    const user = userEvent.setup();
    mount();
    screen.getByRole("radio", { name: "Auto" }).focus();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("radio", { name: "Dark" })).toBeChecked();
    expect(theme()).toBe("dark");
  });

  it("still switches when storage is blocked", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    const user = userEvent.setup();
    mount();
    await user.click(screen.getByRole("radio", { name: "Light" }));
    expect(theme()).toBe("light");
  });
});

describe("outside a provider", () => {
  it("fails loudly rather than defaulting silently", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() =>
      render(
        <Theme theme={turnbaseTheme}>
          <AppearanceControl />
        </Theme>,
      ),
    ).toThrow(/AppearanceProvider/);
  });
});
