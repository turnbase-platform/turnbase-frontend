import { useEffect, useState } from "react";
import { formatSort, parseSort } from "../../ui";
import type { ListEnvelope } from "../../shared/pagination";
import { listGames, type CatalogQuery } from "./catalogApi";
import type { CatalogGame, CatalogSortField } from "./catalog-types";

/** FR-CAT-004: "configurable", default 25. */
export const PAGE_SIZE = 25;

export type CatalogState =
  | { status: "loading" }
  | { status: "loaded"; result: ListEnvelope<CatalogGame> }
  | { status: "error" };

const INITIAL: CatalogQuery = {
  search: "",
  minPlayers: null,
  maxPlayers: null,
  sort: "createdAt",
  direction: "desc", // FR-CAT-007
  page: 1,
  size: PAGE_SIZE,
};

/**
 * VW-CAT-001…003 / FR-CAT-001…010. Owns the query and the one expanded row; every filter, sort
 * and page is a server round trip, so nothing here slices or sorts a fetched page.
 */
export function useCatalog() {
  const [query, setQuery] = useState<CatalogQuery>(INITIAL);
  const [state, setState] = useState<CatalogState>({ status: "loading" });
  // FR-CAT-003: one row expanded at a time.
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listGames(query)
      .then((result) => {
        if (!cancelled) setState({ status: "loaded", result });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [query]);

  // A changed filter restarts at page 1: the old page number means nothing for a new result set.
  function refine(change: Partial<CatalogQuery>) {
    setQuery((previous) => ({ ...previous, ...change, page: 1 }));
    setExpanded(null);
  }

  const filterCount = (query.minPlayers === null ? 0 : 1) + (query.maxPlayers === null ? 0 : 1);

  return {
    state,
    search: query.search,
    minPlayers: query.minPlayers,
    maxPlayers: query.maxPlayers,
    sort: formatSort(query.sort, query.direction),
    page: query.page,
    size: query.size,
    expanded,
    /** Filters in the panel; the search box is not one of them. */
    filterCount,
    /** Everything that narrows the list, the search included. */
    appliedCount: filterCount + (query.search ? 1 : 0),
    setSearch: (search: string) => {
      refine({ search });
    },
    setMinPlayers: (minPlayers: number | null) => {
      refine({ minPlayers });
    },
    setMaxPlayers: (maxPlayers: number | null) => {
      refine({ maxPlayers });
    },
    setSort: (sort: string) => {
      const { field, direction } = parseSort(sort);
      refine({ sort: field as CatalogSortField, direction });
    },
    setSize: (size: number) => {
      refine({ size });
    },
    setPage: (page: number) => {
      setQuery((previous) => ({ ...previous, page }));
      setExpanded(null);
    },
    clearFilters: () => {
      refine({ search: "", minPlayers: null, maxPlayers: null });
    },
    toggle: (gameId: string) => {
      setExpanded((current) => (current === gameId ? null : gameId));
    },
  };
}

export type Catalog = ReturnType<typeof useCatalog>;
