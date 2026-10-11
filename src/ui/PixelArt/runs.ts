export interface Run {
  x: number;
  y: number;
  width: number;
  colour: string;
}

/** Horizontal runs of one colour per row — one `<rect>` each instead of one per cell. */
export function runs(grid: readonly string[]): Run[] {
  const out: Run[] = [];
  grid.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const colour = row.charAt(x);
      if (colour === "." || colour === " ") {
        x += 1;
        continue;
      }
      let end = x;
      while (end < row.length && row.charAt(end) === colour) end += 1;
      out.push({ x, y, width: end - x, colour });
      x = end;
    }
  });
  return out;
}
