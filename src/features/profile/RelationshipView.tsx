import { Button } from "@astryxdesign/core/Button";
import { Link } from "@astryxdesign/core/Link";
import { Text } from "@astryxdesign/core/Text";
import type { Relationship } from "./useRelationship";

/** VW-PROF-006/007: Add / Remove friend, or where a pending request stands. */
export function RelationshipView({ relationship }: { relationship: Relationship }) {
  const { state, isBusy } = relationship;
  if (state === "FRIENDS") {
    return (
      <Button
        label="Remove friend"
        variant="secondary"
        isLoading={isBusy}
        onClick={relationship.remove}
      />
    );
  }
  if (state === "REQUEST_SENT") return <Text>Friend request sent.</Text>;
  if (state === "REQUEST_RECEIVED") {
    return (
      <Text>
        This user sent you a friend request. Respond from{" "}
        <Link href="/friends">your friends page</Link>.
      </Text>
    );
  }
  return (
    <Button label="Add friend" variant="primary" isLoading={isBusy} onClick={relationship.add} />
  );
}
