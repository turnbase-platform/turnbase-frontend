import { Starfield, usePointerEffects } from "../ui";

/**
 * The sky behind every screen, and the one place the pointer effects are switched on
 * (ADR-0017 §1). Mounted once by the shell; views never start either themselves.
 */
export function Backdrop() {
  usePointerEffects();
  return <Starfield />;
}
