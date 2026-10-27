import type { ReactNode } from "react";
import { ImmersiveContext } from "./immersiveContext";

/**
 * The shell side of the immersive room (`immersive-room.md` §3): `set` is called with `true` while
 * a descendant asks for the whole window (`useImmersive`), and `false` when it lets go.
 */
export function ImmersiveProvider({
  set,
  children,
}: {
  set: (on: boolean) => void;
  children: ReactNode;
}) {
  return <ImmersiveContext.Provider value={set}>{children}</ImmersiveContext.Provider>;
}
