import { useEffect, useState } from "react";
import { Route, Routes, useLocation } from "react-router";
import { QuickTour } from "../features/onboarding/QuickTour";
import { ImmersiveProvider } from "../shared/immersive";
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
 * only while it is shown. Inside a room the sky dims. While a room shows its game the page asks for
 * the whole window (`immersive-room.md`): the nav and the sky are not rendered and the page does
 * not scroll.
 */
export function Shell() {
  const { pathname } = useLocation();
  const model = useNavBar();
  const frame = frameFor(pathname);
  const direction = useDirection(pathname, SECTIONS);
  const [immersive, setImmersive] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("snap", frame === "bare");
    return () => {
      root.classList.remove("snap");
    };
  }, [frame]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("immersive", immersive);
    return () => {
      root.classList.remove("immersive");
    };
  }, [immersive]);

  return (
    <ImmersiveProvider set={setImmersive}>
      {!immersive && <Backdrop dim={frame === "wide"} />}
      <div className={styles.app}>
        {!immersive && <NavBar model={model} />}
        <main className={styles.main} data-frame={immersive ? "immersive" : frame}>
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
    </ImmersiveProvider>
  );
}
