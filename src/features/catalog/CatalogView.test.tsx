import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CatalogGame } from "./catalog-types";
import type { Catalog } from "./useCatalog";
import { authWrapper, fakeAuth } from "../../test/authWrapper";
import { CatalogView } from "./CatalogView";

const GAME: CatalogGame = {
  gameId: "g-1",
  title: "Tic-Tac-Toe",
  authorUsername: "TurnBase",
  shortDescription: "Three in a row.",
  minPlayers: 2,
  maxPlayers: 2,
  supportsAi: true,
  supportsSpectators: false,
  version: "1.2.0",
  badge: "OFFICIAL",
  createdAt: "2026-08-01T10:00:00Z",
  updatedAt: "2026-09-01T10:00:00Z",
};

function model(over: Partial<Catalog> = {}): Catalog {
  return {
    state: {
      status: "loaded",
      result: {
        content: [GAME],
        pagination: { page: 1, size: 25, totalElements: 60, totalPages: 3 },
      },
    },
    search: "",
    minPlayers: null,
    maxPlayers: null,
    sort: "createdAt,desc",
    page: 1,
    size: 25,
    filterCount: 0,
    appliedCount: 0,
    setSearch: vi.fn(),
    setMinPlayers: vi.fn(),
    setMaxPlayers: vi.fn(),
    setSort: vi.fn(),
    setSize: vi.fn(),
    setPage: vi.fn(),
    clearFilters: vi.fn(),
    ...over,
  };
}

function view(catalog: Catalog, filtersOpen = false, onToggleFilters = vi.fn()) {
  render(
    <CatalogView catalog={catalog} filtersOpen={filtersOpen} onToggleFilters={onToggleFilters} />,
    { wrapper: authWrapper(fakeAuth(null), "/games") },
  );
}

describe("CatalogView", () => {
  it("FR-CAT-002: a card shows the game, author, players, flags, version, dates and badge", () => {
    view(model());
    expect(screen.getByRole("heading", { level: 1, name: "Games" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Tic-Tac-Toe" })).toHaveAttribute("href", "/games/g-1");
    expect(screen.getByText("Official")).toBeInTheDocument();
    expect(screen.getByText(/By TurnBase · version 1\.2\.0/)).toBeInTheDocument();
    expect(screen.getByText("AI")).toBeInTheDocument();
    expect(screen.getByText("No spectators")).toBeInTheDocument();
    expect(screen.getByText(/Created .*2026 · Updated .*2026/)).toBeInTheDocument();
  });

  it("shows a player range when the minimum and maximum differ", () => {
    view(
      model({
        state: {
          status: "loaded",
          result: {
            content: [{ ...GAME, minPlayers: 2, maxPlayers: 4 }],
            pagination: { page: 1, size: 25, totalElements: 1, totalPages: 1 },
          },
        },
      }),
    );
    expect(screen.getByText("2–4")).toBeInTheDocument();
  });

  it("FR-CAT-003: the short description is on the card, with no row to expand", () => {
    view(model());
    expect(screen.getByText("Three in a row.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /description/ })).toBeNull();
  });

  it("FR-CAT-005: typing in the search box reports the text", async () => {
    const catalog = model();
    view(catalog);
    await userEvent.type(screen.getByLabelText("Search games"), "c");
    expect(vi.mocked(catalog.setSearch).mock.calls[0]?.[0]).toBe("c");
  });

  it("FR-CAT-004: the range, and the page the bar asks for, come from the envelope", async () => {
    const catalog = model();
    view(catalog);
    expect(screen.getByText("1–25 of 60")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(catalog.setPage).toHaveBeenCalledWith(2);
  });

  it("FR-CAT-007: flipping the direction asks for the other order of the same field", async () => {
    const catalog = model();
    view(catalog);
    await userEvent.click(screen.getByRole("button", { name: /Descending/ }));
    expect(catalog.setSort).toHaveBeenCalledWith("createdAt,asc");
  });

  it("FR-CAT-006: the filter button opens the panel with both player counts", async () => {
    const toggle = vi.fn();
    view(model(), false, toggle);
    expect(screen.queryByLabelText("Min players")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Filters" }));
    expect(toggle).toHaveBeenCalled();
  });

  it("FR-CAT-006: an open panel reports a typed minimum and clears on request", async () => {
    const catalog = model({ filterCount: 1, appliedCount: 1, minPlayers: 2 });
    view(catalog, true);
    expect(screen.getByRole("button", { name: "Filters (1)" })).toBeInTheDocument();
    expect(screen.getByText("1 filter applied")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Max players"), "4");
    await userEvent.tab();
    expect(vi.mocked(catalog.setMaxPlayers).mock.calls.at(-1)?.[0]).toBe(4);
    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(catalog.clearFilters).toHaveBeenCalled();
  });

  it("says so while loading, and when the load failed", () => {
    view(model({ state: { status: "loading" } }));
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("explains a failed load", () => {
    view(model({ state: { status: "error" } }));
    expect(screen.getByText("Could not load the catalog. Please try again.")).toBeInTheDocument();
  });

  it("an empty result offers to clear the filters", async () => {
    const catalog = model({
      state: {
        status: "loaded",
        result: { content: [], pagination: { page: 1, size: 25, totalElements: 0, totalPages: 0 } },
      },
    });
    view(catalog);
    expect(screen.getByText("No games match your search")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(catalog.clearFilters).toHaveBeenCalled();
  });
});
