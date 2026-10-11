import { useState } from "react";
import { CatalogView } from "./CatalogView";
import { useCatalog } from "./useCatalog";

/** VW-CAT-001…003 / FR-CAT-001…010: the hook's data in the list-page view. */
export function CatalogPage() {
  const catalog = useCatalog();
  const [filtersOpen, setFiltersOpen] = useState(false);
  return (
    <CatalogView
      catalog={catalog}
      filtersOpen={filtersOpen}
      onToggleFilters={() => {
        setFiltersOpen((open) => !open);
      }}
    />
  );
}
