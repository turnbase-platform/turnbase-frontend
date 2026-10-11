import { Button } from "@astryxdesign/core/Button";
import { Selector } from "@astryxdesign/core/Selector";
import { ISortAsc, ISortDesc } from "../Icon/icons";
import styles from "./SortControl.module.css";
import { formatSort, parseSort } from "./sort";

/**
 * Field plus direction, controlled over the `sort=field,dir` query parameter. The arrow button
 * flips the order and shows the current one. It sorts nothing: the page asks the server.
 */
export function SortControl({
  fields,
  sort,
  onChange,
}: {
  /** The server's sort whitelist: field name → label. */
  fields: Record<string, string>;
  sort: string;
  onChange: (sort: string) => void;
}) {
  const { field, direction } = parseSort(sort);
  const asc = direction === "asc";
  return (
    <div className={styles.row}>
      <div className={styles.field}>
        <Selector
          label="Sort by"
          isLabelHidden
          options={Object.entries(fields).map(([value, label]) => ({ value, label }))}
          value={field}
          onChange={(value) => {
            onChange(formatSort(value, direction));
          }}
        />
      </div>
      <span className={styles.square}>
        <Button
          variant="secondary"
          isIconOnly
          icon={asc ? <ISortAsc /> : <ISortDesc />}
          label={asc ? "Ascending. Switch to descending" : "Descending. Switch to ascending"}
          onClick={() => {
            onChange(formatSort(field, asc ? "desc" : "asc"));
          }}
        />
      </span>
    </div>
  );
}
