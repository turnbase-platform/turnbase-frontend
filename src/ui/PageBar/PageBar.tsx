import { Button } from "@astryxdesign/core/Button";
import { Selector } from "@astryxdesign/core/Selector";
import { Text } from "@astryxdesign/core/Text";
import { IChevron } from "../Icon/icons";
import styles from "./PageBar.module.css";
import { pageWindow } from "./pageWindow";

/**
 * The pager that shares a toolbar row: the range, the page size and previous / numbers / next.
 * Controlled over the 1-based `page` and `size` query parameters, with `total` taken from the
 * server's envelope. It never slices a list; a click asks the page to fetch.
 */
export function PageBar({
  page,
  size,
  total,
  sizes,
  noun,
  onPage,
  onSize,
}: {
  page: number;
  size: number;
  total: number;
  /** Page sizes on offer; the API caps `size` at 100. */
  sizes: readonly number[];
  /** What the list holds, plural: "games". */
  noun: string;
  onPage: (page: number) => void;
  onSize: (size: number) => void;
}) {
  const from = total ? (page - 1) * size + 1 : 0;
  const to = Math.min(total, page * size);
  const pages = Math.max(1, Math.ceil(total / size));
  return (
    <nav className={styles.bar} aria-label={`${noun} pages`}>
      <span className={styles.count}>
        <Text type="supporting" color="secondary">
          {total ? `${String(from)}–${String(to)} of ${String(total)}` : `No ${noun}`}
        </Text>
      </span>
      <div className={styles.size}>
        <Selector
          label="Per page"
          isLabelHidden
          options={sizes.map((n) => ({ value: String(n), label: `${String(n)} / page` }))}
          value={String(size)}
          onChange={(value) => {
            onSize(parseInt(value, 10));
          }}
        />
      </div>
      {pages > 1 && (
        <>
          <span className={styles.square}>
            <Button
              variant="secondary"
              isIconOnly
              icon={<IChevron className={styles.prev} />}
              label="Previous page"
              isDisabled={page <= 1}
              onClick={() => {
                onPage(page - 1);
              }}
            />
          </span>
          {pageWindow(page, pages).map((n, i) =>
            n === null ? (
              <span key={`gap-${String(i)}`} className={styles.gap} aria-hidden="true">
                …
              </span>
            ) : (
              <span key={n} className={styles.number}>
                <Button
                  variant={n === page ? "primary" : "secondary"}
                  label={String(n)}
                  aria-label={`Page ${String(n)}`}
                  aria-current={n === page ? "page" : undefined}
                  onClick={() => {
                    onPage(n);
                  }}
                />
              </span>
            ),
          )}
          <span className={styles.square}>
            <Button
              variant="secondary"
              isIconOnly
              icon={<IChevron className={styles.next} />}
              label="Next page"
              isDisabled={page >= pages}
              onClick={() => {
                onPage(page + 1);
              }}
            />
          </span>
        </>
      )}
    </nav>
  );
}
