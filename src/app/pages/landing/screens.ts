/** The landing's five snap screens, in order; the jump rail and the sections share these ids. */
export const SCREENS = [
  { id: "start", label: "Welcome" },
  { id: "share", label: "Play together" },
  { id: "library", label: "The library" },
  { id: "build", label: "Build a game" },
  { id: "join", label: "Join" },
] as const;

export type ScreenId = (typeof SCREENS)[number]["id"];
