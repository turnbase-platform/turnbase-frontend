// design-system.md §4: the only legal entry point into `src/ui/`. Astryx components are
// imported directly from `@astryxdesign/core/<Component>` — this module holds only what Astryx
// does not ship (composed or swizzled components), and is expected to stay near-empty.
export {};
