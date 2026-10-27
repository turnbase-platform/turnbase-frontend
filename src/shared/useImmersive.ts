import { useContext, useEffect } from "react";
import { ImmersiveContext } from "./immersiveContext";

/** Asks the shell to remove its chrome for as long as the calling component is mounted. */
export function useImmersive(): void {
  const set = useContext(ImmersiveContext);
  useEffect(() => {
    set(true);
    return () => {
      set(false);
    };
  }, [set]);
}
