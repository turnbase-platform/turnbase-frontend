/** Page numbers to show: first, last and the neighbours of the current page, `null` for a gap. */
export function pageWindow(page: number, pages: number): (number | null)[] {
  const keep = [...new Set([1, pages, page - 1, page, page + 1])]
    .filter((n) => n >= 1 && n <= pages)
    .sort((a, b) => a - b);
  const out: (number | null)[] = [];
  let before = 0;
  for (const n of keep) {
    // One missing page is shown rather than hidden behind an ellipsis.
    if (before && n - before === 2) out.push(before + 1);
    else if (before && n - before > 2) out.push(null);
    out.push(n);
    before = n;
  }
  return out;
}
