import { Button } from "@astryxdesign/core/Button";
import { IFilter } from "../Icon/icons";
import styles from "./FilterButton.module.css";

/** Lit while its panel is open, so it reads as a toggle rather than a one-shot action. */
export function FilterButton({
  open,
  count,
  onClick,
  controls,
}: {
  open: boolean;
  /** How many filters currently apply. */
  count: number;
  onClick: () => void;
  /** The `id` of the `FilterPanel` it opens. */
  controls?: string;
}) {
  return (
    <span className={styles.toggle} data-on={open}>
      <Button
        variant="secondary"
        label={count ? `Filters (${String(count)})` : "Filters"}
        icon={<IFilter />}
        onClick={onClick}
        aria-expanded={open}
        aria-controls={controls}
      />
    </span>
  );
}
