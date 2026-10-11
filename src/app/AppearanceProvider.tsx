import { useCallback, useMemo, useState, type ComponentProps, type ReactNode } from "react";
import { Theme } from "@astryxdesign/core/theme";
import {
  AppearanceContext,
  readAppearance,
  writeAppearance,
  useAppearance,
  type Appearance,
} from "./appearance";

/** Holds the Light / Dark / Auto choice and remembers it in the browser. */
export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [appearance, setState] = useState<Appearance>(readAppearance);
  const setAppearance = useCallback((value: Appearance) => {
    setState(value);
    writeAppearance(value);
  }, []);
  const value = useMemo(() => ({ appearance, setAppearance }), [appearance, setAppearance]);
  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

/** `<Theme>` driven by the stored appearance — the one place the mode reaches Astryx. */
export function ThemedRoot({
  theme,
  children,
}: Pick<ComponentProps<typeof Theme>, "theme"> & {
  children: ReactNode;
}) {
  const { appearance } = useAppearance();
  return (
    <Theme theme={theme} mode={appearance}>
      {children}
    </Theme>
  );
}
