import { Text } from "@astryxdesign/core/Text";
import { RoomSection } from "./RoomSection";
import type { RoomResource, RoomStateSnapshot } from "./rooms-types";
import { describeVisibility } from "./visibility";
import styles from "./RoomSettings.module.css";

/**
 * The room's settings as they stand, and the game's parameters. Read-only: the platform offers no
 * way to change either once the room exists, so there is nothing to put a control on.
 */
export function RoomSettings({
  snapshot,
  visibility,
}: {
  snapshot: RoomStateSnapshot;
  visibility?: RoomResource["visibility"];
}) {
  const parameters = Object.entries(snapshot.parameters);
  const rows: [string, string][] = [
    ...(visibility
      ? [["Who can join", describeVisibility(visibility).label] as [string, string]]
      : []),
    [
      "Spectators",
      snapshot.spectatingEnabled ? `Up to ${String(snapshot.spectatorCapacity)}` : "Not allowed",
    ],
    ...parameters.map(([key, value]): [string, string] => [
      key,
      typeof value === "string" ? value : JSON.stringify(value),
    ]),
  ];
  return (
    <RoomSection title="Room settings">
      <dl aria-label="Room settings" className={styles.list}>
        {rows.map(([key, value]) => (
          <div key={key} className={styles.row}>
            <dt>
              <Text color="secondary">{key}</Text>
            </dt>
            <dd>
              <Text>{value}</Text>
            </dd>
          </div>
        ))}
      </dl>
      {parameters.length === 0 && <Text color="secondary">This game has no parameters.</Text>}
    </RoomSection>
  );
}
