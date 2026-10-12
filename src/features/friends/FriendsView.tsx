import { useState } from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Heading } from "@astryxdesign/core/Heading";
import { Link } from "@astryxdesign/core/Link";
import { Text } from "@astryxdesign/core/Text";
import { LoadError } from "../../shared/LoadError";
import { PageHead, Pane, PillTabs, Person } from "../../ui";
import type { PendingRequest } from "./friends-types";
import type { Friends } from "./useFriends";
import styles from "./FriendsView.module.css";

type Tab = "all" | "requests";

function RequestRow({
  request,
  index,
  children,
}: {
  request: PendingRequest;
  index: number;
  children: React.ReactNode;
}) {
  return (
    <li style={{ "--i": index } as React.CSSProperties}>
      <Card padding={3}>
        <div className={styles.request}>
          <Person name={request.counterpartUsername} />
          <Link href={`/users/${request.counterpartUsername}`} color="inherit">
            <Text weight="semibold">{request.counterpartUsername}</Text>
          </Link>
          <div className={styles.actions}>{children}</div>
        </div>
      </Card>
    </li>
  );
}

function Requests({ friends }: { friends: Friends }) {
  const { requests, incoming, outgoing, accept, decline, cancel, reloadRequests } = friends;
  if (requests.status === "loading") return <Text>Loading…</Text>;
  if (requests.status === "error") {
    return <LoadError message="Could not load your friend requests." onRetry={reloadRequests} />;
  }
  return (
    <div className={styles.group}>
      {incoming.length === 0 ? (
        <EmptyState title="No pending requests" isCompact />
      ) : (
        <ul className={styles.rows} aria-label="Incoming requests">
          {incoming.map((request, index) => (
            <RequestRow key={request.requestId} request={request} index={index}>
              <Button
                label="Accept"
                aria-label={`Accept ${request.counterpartUsername}`}
                variant="secondary"
                onClick={() => {
                  accept(request);
                }}
              />
              <Button
                label="Decline"
                aria-label={`Decline ${request.counterpartUsername}`}
                variant="ghost"
                onClick={() => {
                  decline(request);
                }}
              />
            </RequestRow>
          ))}
        </ul>
      )}
      {outgoing.length > 0 && (
        <>
          <Heading level={3}>Sent requests</Heading>
          <ul className={styles.rows} aria-label="Requests you sent">
            {outgoing.map((request, index) => (
              <RequestRow key={request.requestId} request={request} index={index}>
                <Button
                  label="Cancel"
                  aria-label={`Cancel request to ${request.counterpartUsername}`}
                  variant="ghost"
                  onClick={() => {
                    cancel(request);
                  }}
                />
              </RequestRow>
            ))}
          </ul>
        </>
      )}
    </div>
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
    <ul className={styles.cards} aria-label="Your friends">
      {list.items.map((friend, index) => (
        <li key={friend.userId} style={{ "--i": index } as React.CSSProperties}>
          <Card padding={3}>
            <div className={styles.friend}>
              <Person name={friend.username} />
              <Link href={`/users/${friend.username}`} color="inherit">
                <Text weight="semibold">{friend.username}</Text>
              </Link>
              <Button
                label="Remove"
                aria-label={`Remove ${friend.username}`}
                variant="ghost"
                onClick={() => {
                  remove(friend);
                }}
              />
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}

/**
 * VW-FREN-001…005: the friends in one tab, the pending requests in the other, with the incoming
 * count on the tab. There are no presence groups (ADR-0017 §4).
 */
export function FriendsView({ friends }: { friends: Friends }) {
  const [tab, setTab] = useState<Tab>("all");
  const count =
    friends.friends.status === "ready" ? ` (${String(friends.friends.items.length)})` : "";
  return (
    <div className={styles.page}>
      <PageHead title="Friends" subtitle="Your friends and the requests waiting for you." />
      <PillTabs
        label="Friends sections"
        value={tab}
        panelId="friends-panel"
        items={[
          { value: "all", label: `All friends${count}` },
          {
            value: "requests",
            label: "Requests",
            end:
              friends.incoming.length > 0 ? (
                <Badge variant="warning" label={String(friends.incoming.length)} />
              ) : undefined,
          },
        ]}
        onChange={(value) => {
          setTab(value as Tab);
        }}
      />
      <div
        id="friends-panel"
        role="tabpanel"
        aria-label={tab === "all" ? "All friends" : "Requests"}
      >
        <Pane id={tab}>
          {tab === "all" ? <YourFriends friends={friends} /> : <Requests friends={friends} />}
        </Pane>
      </div>
    </div>
  );
}
