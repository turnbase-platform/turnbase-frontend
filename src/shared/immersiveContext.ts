import { createContext } from "react";

/** Set by the shell; called with `true` to take the whole window and `false` to give it back. */
export const ImmersiveContext = createContext<(on: boolean) => void>(() => undefined);
