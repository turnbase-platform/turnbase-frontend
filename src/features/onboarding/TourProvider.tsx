import { useMemo, useState, type ReactNode } from "react";
import { TourContext, type Tour } from "./tourContext";

/**
 * Whether the quick tour is showing. The shell mounts one provider; the account menu's "Replay the
 * tour", the landing's "See how it works" and the first sign-up all open the same dialog.
 */
export function TourProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const tour = useMemo<Tour>(
    () => ({
      isOpen,
      open: () => {
        setOpen(true);
      },
      close: () => {
        setOpen(false);
      },
    }),
    [isOpen],
  );
  return <TourContext value={tour}>{children}</TourContext>;
}
