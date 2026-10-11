import type { ReactNode } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Text } from "@astryxdesign/core/Text";
import styles from "./FilterPanel.module.css";

/**
 * The filter section a list page opens above its rows. Its footer always says how many filters
 * apply and keeps Clear in view. Whether it is shown is the page's decision (see `FilterButton`).
 */
export function FilterPanel({
  id,
  count,
  onClear,
  children,
}: {
  id?: string;
  /** How many filters currently apply. */
  count: number;
  onClear: () => void;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-label="Filters" className={styles.scroll}>
      <Card padding={5} elevation="low">
        <div className={styles.body}>
          {children}
          <div className={styles.foot}>
            <Text type="supporting" color="secondary">
              {count
                ? `${String(count)} filter${count > 1 ? "s" : ""} applied`
                : "No filters applied"}
            </Text>
            <Button
              variant="secondary"
              label="Clear filters"
              onClick={onClear}
              isDisabled={!count}
            />
          </div>
        </div>
      </Card>
    </section>
  );
}
