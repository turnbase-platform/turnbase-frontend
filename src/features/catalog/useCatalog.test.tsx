import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ListEnvelope } from "../../shared/pagination";
import type { CatalogGame } from "./catalog-types";
import { listGames } from "./catalogApi";
import { useCatalog } from "./useCatalog";

vi.mock("./catalogApi", () => ({ listGames: vi.fn() }));

const game = (n: number): CatalogGame => ({
  gameId: `g-${String(n)}`,
  title: `Game ${String(n)}`,
  authorUsername: "TurnBase",
  shortDescription: `About ${String(n)}`,
  minPlayers: 2,
  maxPlayers: 4,
  supportsAi: false,
  supportsSpectators: false,
  version: "1.0.0",
  badge: "OFFICIAL",
  createdAt: "2026-08-01T10:00:00Z",
  updatedAt: "2026-09-01T10:00:00Z",
});

const envelope = (content: CatalogGame[], page = 1, totalPages = 1): ListEnvelope<CatalogGame> => ({
  content,
  pagination: { page, size: 25, totalElements: totalPages * 25, totalPages },
});

const asked = () => vi.mocked(listGames).mock.calls.map(([query]) => query);

beforeEach(() => {
  vi.mocked(listGames).mockReset();
  vi.mocked(listGames).mockResolvedValue(envelope([game(1)]));
});

describe("useCatalog", () => {
  it("FR-CAT-004/007: starts loading, then asks for page 1, 25 rows, newest first", async () => {
    const { result } = renderHook(() => useCatalog());
    expect(result.current.state.status).toBe("loading");

    await waitFor(() => {
      expect(result.current.state.status).toBe("loaded");
    });
    expect(asked()[0]).toEqual({
      search: "",
      minPlayers: null,
      maxPlayers: null,
      sort: "createdAt",
      direction: "desc",
      page: 1,
      size: 25,
    });
    expect(result.current.sort).toBe("createdAt,desc");
  });

  it("FR-CAT-005: a new search is a server query that restarts at page 1", async () => {
    vi.mocked(listGames).mockResolvedValue(envelope([game(1)], 1, 3));
    const { result } = renderHook(() => useCatalog());
    await waitFor(() => {
      expect(result.current.state.status).toBe("loaded");
    });
    act(() => {
      result.current.setPage(3);
    });
    act(() => {
      result.current.setSearch("tic");
    });

    await waitFor(() => {
      expect(asked().at(-1)).toMatchObject({ search: "tic", page: 1 });
    });
    expect(result.current.page).toBe(1);
  });

  it("FR-CAT-006: player counts filter on the server and count as filters", async () => {
    const { result } = renderHook(() => useCatalog());
    await waitFor(() => {
      expect(result.current.state.status).toBe("loaded");
    });
    expect(result.current.filterCount).toBe(0);

    act(() => {
      result.current.setMinPlayers(2);
      result.current.setMaxPlayers(4);
    });

    await waitFor(() => {
      expect(asked().at(-1)).toMatchObject({ minPlayers: 2, maxPlayers: 4 });
    });
    expect(result.current.filterCount).toBe(2);
  });

  it("FR-CAT-007: a sort string splits into the API's field and direction", async () => {
    const { result } = renderHook(() => useCatalog());
    await waitFor(() => {
      expect(result.current.state.status).toBe("loaded");
    });
    act(() => {
      result.current.setSort("title,asc");
    });
    await waitFor(() => {
      expect(asked().at(-1)).toMatchObject({ sort: "title", direction: "asc", page: 1 });
    });
  });

  it("changing the page size restarts at page 1; changing only the page keeps the filters", async () => {
    const { result } = renderHook(() => useCatalog());
    await waitFor(() => {
      expect(result.current.state.status).toBe("loaded");
    });
    act(() => {
      result.current.setSearch("x");
    });
    act(() => {
      result.current.setPage(2);
    });
    await waitFor(() => {
      expect(asked().at(-1)).toMatchObject({ search: "x", page: 2 });
    });
    act(() => {
      result.current.setSize(50);
    });
    await waitFor(() => {
      expect(asked().at(-1)).toMatchObject({ search: "x", size: 50, page: 1 });
    });
  });

  it("clearFilters drops the search and both counts", async () => {
    const { result } = renderHook(() => useCatalog());
    await waitFor(() => {
      expect(result.current.state.status).toBe("loaded");
    });
    act(() => {
      result.current.setSearch("x");
      result.current.setMinPlayers(2);
    });
    expect(result.current.appliedCount).toBe(2);

    act(() => {
      result.current.clearFilters();
    });
    expect(result.current.search).toBe("");
    expect(result.current.appliedCount).toBe(0);
  });

  it("reports a failed load as an error", async () => {
    vi.mocked(listGames).mockRejectedValue(new Error("down"));
    const { result } = renderHook(() => useCatalog());
    await waitFor(() => {
      expect(result.current.state.status).toBe("error");
    });
  });

  it("ignores an answer that arrives after the query moved on", async () => {
    let release: (value: ListEnvelope<CatalogGame>) => void = () => undefined;
    vi.mocked(listGames).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    const { result } = renderHook(() => useCatalog());
    act(() => {
      result.current.setSearch("new");
    });
    await waitFor(() => {
      expect(result.current.state).toMatchObject({ status: "loaded" });
    });
    await act(async () => {
      release(envelope([game(9)]));
      await Promise.resolve();
    });
    expect(result.current.state).toMatchObject({ status: "loaded" });
    if (result.current.state.status === "loaded") {
      expect(result.current.state.result.content[0]?.gameId).toBe("g-1");
    }
  });
});
