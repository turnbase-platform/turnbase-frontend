// design-system.md §4: the only legal entry point into `src/ui/`. Astryx components are
// imported directly from `@astryxdesign/core/<Component>` — this module holds only what Astryx
// does not ship (ADR-0017 §3): pointer effects, the starfield, the mark and pixel art, the icon
// set, page tabs, the directional pane, and the list-query kit.
export { prefersReducedMotion, useReducedMotion } from "./motion/motion";
export { useMotionPreferences, type MotionPreferences } from "./motion/preferences";
export { initPointerEffects, usePointerEffects } from "./fx/pointerEffects";
export { Starfield } from "./Starfield/Starfield";
export { Logo } from "./Logo/Logo";
export { PixelArt } from "./PixelArt/PixelArt";
export { runs, type Run } from "./PixelArt/runs";
export { ART } from "./PixelArt/art";
export * from "./Icon/icons";
export { PillTabs, type PillTab } from "./PillTabs/PillTabs";
export { Pane } from "./Pane/Pane";
export { directionBetween, useDirection, type Direction } from "./Pane/direction";
export { ScrollPanel } from "./ScrollPanel/ScrollPanel";
export { FilterPanel } from "./FilterPanel/FilterPanel";
export { FilterButton } from "./FilterButton/FilterButton";
export { SortControl } from "./SortControl/SortControl";
export { formatSort, parseSort, type SortDirection } from "./SortControl/sort";
export { PageBar } from "./PageBar/PageBar";
export { pageWindow } from "./PageBar/pageWindow";
export { ListPage } from "./ListPage/ListPage";
export { CardPage, FormFields } from "./CardPage/CardPage";
export { SectionCard } from "./SectionCard/SectionCard";
export { PIECES } from "./PixelArt/pieces";
export { GameCover } from "./GameCover/GameCover";
export { coverFor, type Cover } from "./GameCover/cover";
export { Person } from "./Person/Person";
export { Chip, type ChipTone } from "./Chip/Chip";
export { Row, Stack } from "./Layout/Layout";
export { PageHead } from "./PageHead/PageHead";
