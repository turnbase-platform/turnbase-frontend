import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { useIndicator } from "../motion/useIndicator";
import styles from "./PillTabs.module.css";

export interface PillTab {
  value: string;
  label: string;
  /** Trailing adornment, such as a count badge. */
  end?: ReactNode;
}

/**
 * Page-level tabs: the pill and sliding indicator of the top bar, so navigation reads the same
 * everywhere. Astryx ships no tab strip with that treatment (ADR-0017 §3). Roving tabindex,
 * arrow/Home/End keys, selection follows focus.
 */
export function PillTabs({
  label,
  value,
  items,
  onChange,
  panelId,
}: {
  label: string;
  value: string;
  items: readonly PillTab[];
  onChange: (value: string) => void;
  /** The `id` of the element these tabs switch, when it is a `role="tabpanel"`. */
  panelId?: string;
}) {
  const base = useId();
  const box = useRef<HTMLDivElement>(null);
  const selected = items.findIndex((i) => i.value === value);
  const indicator = useIndicator(box, "[role=tab]", selected, items.map((i) => i.label).join("\n"));

  const onKeyDown = (event: KeyboardEvent) => {
    const last = items.length - 1;
    let next: number;
    switch (event.key) {
      case "ArrowRight":
        next = selected >= last ? 0 : selected + 1;
        break;
      case "ArrowLeft":
        next = selected <= 0 ? last : selected - 1;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = last;
        break;
      default:
        return;
    }
    event.preventDefault();
    onChange(items[next].value);
    box.current?.querySelectorAll<HTMLElement>("[role=tab]")[next]?.focus();
  };

  return (
    <div className={styles.tabs} role="tablist" aria-label={label} ref={box} onKeyDown={onKeyDown}>
      {indicator && (
        <span
          className={styles.indicator}
          aria-hidden="true"
          style={{ left: indicator.left, width: indicator.width }}
        />
      )}
      {items.map((item) => {
        const on = item.value === value;
        return (
          <button
            key={item.value}
            id={`${base}-${item.value}`}
            type="button"
            role="tab"
            aria-selected={on}
            aria-controls={on ? panelId : undefined}
            tabIndex={on ? 0 : -1}
            className={styles.tab}
            onClick={() => {
              onChange(item.value);
            }}
          >
            {item.label}
            {item.end}
          </button>
        );
      })}
    </div>
  );
}
