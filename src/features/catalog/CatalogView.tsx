import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import {
  FilterButton,
  FilterPanel,
  ISearch,
  ListPage,
  PageBar,
  ScrollPanel,
  SortControl,
} from "../../ui";
import type { CatalogSortField } from "./catalog-types";
import type { Catalog } from "./useCatalog";
import { GameCard } from "./GameCard";
import styles from "./CatalogView.module.css";

const SORT_LABELS: Record<CatalogSortField, string> = {
  title: "Name",
  author: "Author",
  minPlayers: "Min players",
  maxPlayers: "Max players",
  version: "Version",
  createdAt: "Created",
  updatedAt: "Last updated",
};

const PAGE_SIZES = [10, 25, 50, 100] as const;

/** VW-CAT-001…003: the catalog as a list page. It renders what `useCatalog` hands it. */
export function CatalogView({
  catalog,
  filtersOpen,
  onToggleFilters,
}: {
  catalog: Catalog;
  filtersOpen: boolean;
  onToggleFilters: () => void;
}) {
  const total =
    catalog.state.status === "loaded" ? catalog.state.result.pagination.totalElements : 0;
  return (
    <ListPage
      title="Games"
      subtitle="Pick one, then make a room or join an open one."
      toolbar={
        <>
          <div className={styles.search}>
            <TextInput
              label="Search games"
              isLabelHidden
              placeholder="Name, author or tag"
              startIcon={ISearch}
              hasClear
              value={catalog.search}
              onChange={catalog.setSearch}
            />
          </div>
          <FilterButton
            open={filtersOpen}
            count={catalog.filterCount}
            onClick={onToggleFilters}
            controls="catalog-filters"
          />
          <SortControl fields={SORT_LABELS} sort={catalog.sort} onChange={catalog.setSort} />
          <PageBar
            page={catalog.page}
            size={catalog.size}
            total={total}
            sizes={PAGE_SIZES}
            noun="games"
            onPage={catalog.setPage}
            onSize={catalog.setSize}
          />
        </>
      }
    >
      {filtersOpen && (
        <FilterPanel
          id="catalog-filters"
          count={catalog.appliedCount}
          onClear={catalog.clearFilters}
        >
          <div className={styles.filters}>
            <NumberInput
              label="Min players"
              value={catalog.minPlayers}
              min={1}
              isIntegerOnly
              hasClear
              onChange={(n) => {
                catalog.setMinPlayers(Number.isNaN(n) ? null : n);
              }}
            />
            <NumberInput
              label="Max players"
              value={catalog.maxPlayers}
              min={1}
              isIntegerOnly
              hasClear
              onChange={(n) => {
                catalog.setMaxPlayers(Number.isNaN(n) ? null : n);
              }}
            />
          </div>
        </FilterPanel>
      )}
      <ScrollPanel label="Games">
        <Rows catalog={catalog} />
      </ScrollPanel>
    </ListPage>
  );
}

function Rows({ catalog }: { catalog: Catalog }) {
  const { state } = catalog;
  if (state.status === "loading")
    return (
      <div className={styles.status}>
        <Text>Loading…</Text>
      </div>
    );
  if (state.status === "error")
    return <Banner status="error" title="Could not load the catalog. Please try again." />;

  const { content } = state.result;
  if (content.length === 0)
    return (
      <EmptyState
        title="No games match your search"
        description="Try a different word, or loosen a filter."
        actions={
          <Button label="Clear filters" variant="secondary" onClick={catalog.clearFilters} />
        }
      />
    );

  return (
    <div className={styles.grid} key={content.map((game) => game.gameId).join()}>
      {content.map((game, index) => (
        <GameCard key={game.gameId} game={game} index={index} />
      ))}
    </div>
  );
}
