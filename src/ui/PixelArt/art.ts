import { PIECES } from "./pieces";

/**
 * Pixel-art grids: one character per cell, drawn from the `--px-*` palette in the theme —
 * a cyan · b magenta · c amber · d ink · e dim — and `.` for empty.
 *
 * The platform's own marks live here, plus the generic pieces of `pieces.ts`. A game's cover art
 * is the game's, served by the catalogue, not drawn by the shell.
 */
export const ART: Record<string, readonly string[]> = {
  ...PIECES,
  // 2x2 board: a player (cyan), the die whose roll is your turn (amber), the dev prompt (ink), a friend (magenta)
  logo: [
    "..a...ccccc",
    ".aaa..c...c",
    "..a...c.c.c",
    ".aaa..c...c",
    "aaaaa.ccccc",
    "...........",
    "d.......b..",
    ".d.....bbb.",
    "..d.....b..",
    ".d.....bbb.",
    "d..dd.bbbbb",
  ],
  heart: [".bb..bb.", "bbbbbbbb", "bbbbbbbb", ".bbbbbb.", "..bbbb..", "...bb..."],
  bolt: ["...cc", "..cc.", ".cc..", "cccc.", "..cc.", ".cc..", "cc..."],
  // whose turn it is
  hourglass: [
    "ddddddddd",
    "dcccccccd",
    ".dcccccd.",
    "..dcccd..",
    "...dcd...",
    "....d....",
    "...d.d...",
    "..d.c.d..",
    ".d.ccc.d.",
    "dcccccccd",
    "ddddddddd",
  ],
};
