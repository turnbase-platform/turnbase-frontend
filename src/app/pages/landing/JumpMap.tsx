import { createPortal } from "react-dom";
import { prefersReducedMotion } from "../../../ui";
import { SCREENS } from "./screens";
import { useActiveSection } from "./useActiveSection";
import styles from "./JumpMap.module.css";

const IDS = SCREENS.map((s) => s.id);

/**
 * A dot rail on the right edge that follows the screen snapped into view and jumps to another.
 * Portaled to the body: the page pane animates a transform, which would make `position: fixed`
 * mean "fixed to the pane".
 */
export function JumpMap() {
  const current = useActiveSection(IDS);
  return createPortal(
    <nav className={styles.jump} aria-label="Landing sections">
      {SCREENS.map((screen) => (
        <a
          key={screen.id}
          href={`#${screen.id}`}
          aria-current={current === screen.id ? "true" : undefined}
          onClick={(event) => {
            event.preventDefault();
            document.getElementById(screen.id)?.scrollIntoView({
              behavior: prefersReducedMotion() ? "auto" : "smooth",
              block: "start",
            });
          }}
        >
          <span>{screen.label}</span>
          <i />
        </a>
      ))}
    </nav>,
    document.body,
  );
}
