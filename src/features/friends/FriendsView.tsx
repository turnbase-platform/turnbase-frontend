import { Avatar } from "@astryxdesign/core/Avatar";
import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Heading } from "@astryxdesign/core/Heading";
import { Link } from "@astryxdesign/core/Link";
import { List, ListItem } from "@astryxdesign/core/List";
import { Text } from "@astryxdesign/core/Text";
import { VisuallyHidden } from "@astryxdesign/core/VisuallyHidden";
import { LoadError } from "../../shared/LoadError";
import { SectionCard } from "../../ui";
import type { Friends } from "./useFriends";
import styles from "./FriendsView.module.css";

function Requests({ friends }: { friends: Friends }) {
  const { requests, incoming, outgoing, accept, decline, cancel, reloadRequests } = friends;
  if (requests.status === "loading") return <Text>Loading…</Text>;
  if (requests.status === "error") {
    return <LoadError message="Could not load your friend requests." onRetry={reloadRequests} />;
  }
  return (
    <>
      {incoming.length === 0 ? (
        <EmptyState title="No pending requests" isCompact />
      ) : (
        <List header={<VisuallyHidden>Incoming requests</VisuallyHidden>} hasDividers>
          {incoming.map((request) => (
            <ListItem
              key={request.requestId}
              label={request.counterpartUsername}
              startContent={<Avatar name={request.counterpartUsername} size="sm" tooltip={false} />}
              endContent={
                <div className={styles.actions}>
                  <Button
                    label="Accept"
                    aria-label={`Accept ${request.counterpartUsername}`}
                    variant="primary"
                    onClick={() => {
                      accept(request);
                    }}
                  />
                  <Button
                    label="Decline"
                    aria-label={`Decline ${request.counterpartUsername}`}
                    variant="secondary"
                    onClick={() => {
                      decline(request);
                    }}
                  />
                </div>
              }
            />
          ))}
        </List>
      )}
      {outgoing.length > 0 && (
        <div className={styles.group}>
          <Heading level={3}>Sent</Heading>
          <List header={<VisuallyHidden>Sent requests</VisuallyHidden>} hasDividers>
            {outgoing.map((request) => (
              <ListItem
                key={request.requestId}
                label={request.counterpartUsername}
                startContent={
                  <Avatar name={request.counterpartUsername} size="sm" tooltip={false} />
                }
                endContent={
                  <Button
                    label="Cancel"
                    aria-label={`Cancel request to ${request.counterpartUsername}`}
                    variant="ghost"
                    onClick={() => {
                      cancel(request);
                    }}
                  />
                }
              />
            ))}
          </List>
        </div>
      )}
    </>
  );
}

function YourFriends({ friends }: { friends: Friends }) {
  const { friends: list, remove, reloadFriends } = friends;
  if (list.status === "loading") return <Text>Loading…</Text>;
  if (list.status === "error") {
    return <LoadError message="Could not load your friends." onRetry={reloadFriends} />;
  }
  if (list.items.length === 0) {
    return (
      <EmptyState
        title="No friends yet"
        description="Visit a profile to send a friend request."
        isCompact
      />
    );
  }
  return (
    <List header={<VisuallyHidden>Your friends</VisuallyHidden>} hasDividers>
      {list.items.map((friend) => (
        <ListItem
          key={friend.userId}
          label={friend.username}
          startContent={<Avatar name={friend.username} size="sm" tooltip={false} />}
          endContent={
            <div className={styles.actions}>
              <Link href={`/users/${friend.username}`}>View profile</Link>
              <Button
                label="Remove"
                aria-label={`Remove ${friend.username}`}
                variant="ghost"
                onClick={() => {
                  remove(friend);
                }}
              />
            </div>
          }
        />
      ))}
    </List>
  );
}

/** VW-FREN-001…005: pending requests above one list of friends — no presence groups (ADR-0017 §4). */
export function FriendsView({ friends }: { friends: Friends }) {
  return (
    <div className={styles.page}>
      <Heading level={1} type="display-2">
        Friends
      </Heading>
      <SectionCard title="Requests">
        <Requests friends={friends} />
      </SectionCard>
      <SectionCard title="Your friends">
        <YourFriends friends={friends} />
      </SectionCard>
    </div>
  );
}
