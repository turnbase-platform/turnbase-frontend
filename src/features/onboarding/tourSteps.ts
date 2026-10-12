import type { PIECES } from "../../ui";

export interface TourStep {
  /** The Stepper label: one word. */
  label: string;
  title: string;
  piece: keyof typeof PIECES;
  body: string;
  points: readonly string[];
}

/** The five panes of the quick tour. What the platform does not do (presence, live counts) is not promised. */
export const TOUR_STEPS: readonly TourStep[] = [
  {
    label: "Hello",
    title: "Welcome to TurnBase",
    piece: "dice",
    body: "A place to play turn-based games with friends and strangers. Each move waits for you, so you can play at your own pace.",
    points: [
      "Official classics and community games",
      "Rooms for as many players as the game allows",
      "History and stats for every game",
    ],
  },
  {
    label: "Play",
    title: "Find a game and join in",
    piece: "cards",
    body: "Browse the catalog, read about a game, then join an open room or spectate one in progress.",
    points: [
      "Search and filter the catalog",
      "Spectate any room that allows it",
      "Join with a code from a friend",
    ],
  },
  {
    label: "Rooms",
    title: "Make a room",
    piece: "ship",
    body: "Pick a game, choose who can join and share the link. Set teams and game options, then start when everyone is ready.",
    points: [
      "Public, friends only or invite only",
      "As host, set teams and game options",
      "Chat while you wait",
    ],
  },
  {
    label: "Friends",
    title: "Bring your friends",
    piece: "meeple",
    body: "Add friends by username and invite them straight into a room.",
    points: [
      "Friend requests are always opt-in",
      "Block anyone, any time",
      "Invitations land in your notifications",
    ],
  },
  {
    label: "Build",
    title: "Build your own game",
    piece: "planet",
    body: "Write game rules in Java and a board in any language that compiles to JavaScript. Upload a bundle and it shows up in the catalog.",
    points: [
      "A public SDK with typed contracts",
      "Sandboxed, so players stay safe",
      "Your game gets rooms and history for free",
    ],
  },
];
