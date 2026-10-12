import { Text } from "@astryxdesign/core/Text";
import { ICheck } from "../Icon/icons";
import styles from "./CheckList.module.css";

/** A short list of reasons or points, each with a cyan tick. */
export function CheckList({ items }: { items: readonly string[] }) {
  return (
    <ul className={styles.list}>
      {items.map((item) => (
        <li key={item} className={styles.item}>
          <ICheck size={18} className={styles.tick} />
          <Text color="secondary">{item}</Text>
        </li>
      ))}
    </ul>
  );
}
