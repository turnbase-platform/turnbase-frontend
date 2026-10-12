import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router";
import { QuickTour } from "../features/onboarding/QuickTour";
import { Pane, useDirection } from "../ui";
import { Backdrop } from "./Backdrop";
import { frameFor, SECTIONS } from "./frame";
import { NavBar } from "./NavBar";
import { RouteGuard } from "./RouteGuard";
import { appRoutes } from "./routes";
import styles from "./Shell.module.css";
import { useNavBar } from "./useNavBar";

/**
 * The screen frame: the sky, the floating navigation and the page, which slides in the direction
 * of travel along the nav (ADR-0017 §5). The landing snaps to its screens, so `html.snap` is set
 * only while it is shown. Inside a room the sky dims.
 */
export function Shell() {
  const { pathname } = useLocation();
  const model = useNavBar();
  const frame = frameFor(pathname);
  const direction = useDirection(pathname, SECTIONS);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("snap", frame === "bare");
    return () => {
      root.classList.remove("snap");
    };
  }, [frame]);

  return (
    <>
      <Backdrop dim={frame === "wide"} />
      <div className={styles.app}>
        <NavBar model={model} />
        <main className={styles.main} data-frame={frame}>
          <Pane id={pathname} direction={direction} className={styles.pane}>
            <Routes>
              {appRoutes.map(({ path, access, element }) => (
                <Route
                  key={path}
                  path={path}
                  element={<RouteGuard access={access}>{element}</RouteGuard>}
                />
              ))}
            </Routes>
          </Pane>
        </main>
      </div>
      <QuickTour />
    </>
  );
}
