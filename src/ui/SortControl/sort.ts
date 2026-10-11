export type SortDirection = "asc" | "desc";

/** `pagination-filtering-sorting.md`: the wire form is `field,dir`, with `asc` the default. */
export function parseSort(sort: string): { field: string; direction: SortDirection } {
  const [field = "", direction] = sort.split(",");
  return { field, direction: direction === "desc" ? "desc" : "asc" };
}

export function formatSort(field: string, direction: SortDirection): string {
  return `${field},${direction}`;
}
