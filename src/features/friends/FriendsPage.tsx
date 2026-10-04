import { useEffect, useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Heading } from "@astryxdesign/core/Heading";
import { Link } from "@astryxdesign/core/Link";
import { List, ListItem } from "@astryxdesign/core/List";
import { VisuallyHidden } from "@astryxdesign/core/VisuallyHidden";
import { Stack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { useToast } from "@astryxdesign/core/Toast";
import { ApiError } from "../../shared/api";
import { LoadError } from "../../shared/LoadError";
import { useAuth } from "../auth/auth-context";
import {
  acceptFriendRequest,
  deleteFriendRequest,
  fetchFriends,
  fetchPendingRequests,
  removeFriend,
} from "./friendsApi";
import type { FriendSummary, PendingRequest } from "./friends-types";

type Loaded<T> = { status: "loading" } | { status: "error" } | { status: "ready"; items: T[] };

/** VW-FREN-001…005. */
export function FriendsPage() {
  const { principal } = useAuth();
  const username = principal?.username ?? "";
  const [friends, setFriends] = useState<Loaded<FriendSummary>>({ status: "loading" });
  const [requests, setRequests] = useState<Loaded<PendingRequest>>({ status: "loading" });
  const showToast = useToast();

  function reloadFriends() {
    fetchFriends(username)
      .then((page) => {
        setFriends({ status: "ready", items: page.content });
      })
      .catch(() => {
        setFriends({ status: "error" });
      });
  }

  function reloadRequests() {
    fetchPendingRequests()
      .then((page) => {
        setRequests({ status: "ready", items: page.content });
      })
      .catch(() => {
        setRequests({ status: "error" });
      });
  }

  useEffect(() => {
    reloadFriends();
    reloadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  /** Runs one action; a failure names it, then both lists are re-read so a stale row goes away. */
  function act(failure: string, run: () => Promise<unknown>) {
    run()
      .catch((error: unknown) => {
        const detail = error instanceof ApiError && error.status === 422 ? ` ${error.message}` : "";
        showToast({ type: "error", body: `${failure}.${detail}` });
      })
      .finally(() => {
        reloadFriends();
        reloadRequests();
      });
  }

  const all = requests.status === "ready" ? requests.items : [];
  const incoming = all.filter((request) => request.direction === "INCOMING");
  const outgoing = all.filter((request) => request.direction === "OUTGOING");

  return (
    <Stack gap={6} padding={6}>
      <Heading level={1}>Friends</Heading>

      <Stack gap={2}>
        <Heading level={2}>Incoming requests</Heading>
        {requests.status === "loading" ? (
          <Text>Loading…</Text>
        ) : requests.status === "error" ? (
          <LoadError message="Could not load your friend requests." onRetry={reloadRequests} />
        ) : incoming.length === 0 ? (
          <EmptyState title="No pending requests" isCompact />
        ) : (
          <List header={<VisuallyHidden>Incoming requests</VisuallyHidden>} hasDividers>
            {incoming.map((request) => (
              <ListItem
                key={request.requestId}
                label={request.counterpartUsername}
                endContent={
                  <Stack direction="horizontal" gap={2}>
                    <Button
                      label="Accept"
                      aria-label={`Accept ${request.counterpartUsername}`}
                      variant="primary"
                      onClick={() => {
                        act(
                          `Could not accept ${request.counterpartUsername}'s friend request`,
                          () => acceptFriendRequest(request.requestId),
                        );
                      }}
                    />
                    <Button
                      label="Decline"
                      aria-label={`Decline ${request.counterpartUsername}`}
                      variant="secondary"
                      onClick={() => {
                        act(
                          `Could not decline ${request.counterpartUsername}'s friend request`,
                          () => deleteFriendRequest(request.requestId),
                        );
                      }}
                    />
                  </Stack>
                }
              />
            ))}
          </List>
        )}
      </Stack>

      {outgoing.length > 0 && (
        <Stack gap={2}>
          <Heading level={2}>Sent requests</Heading>
          <List header={<VisuallyHidden>Sent requests</VisuallyHidden>} hasDividers>
            {outgoing.map((request) => (
              <ListItem
                key={request.requestId}
                label={request.counterpartUsername}
                endContent={
                  <Button
                    label="Cancel"
                    aria-label={`Cancel request to ${request.counterpartUsername}`}
                    variant="ghost"
                    onClick={() => {
                      act(`Could not cancel your request to ${request.counterpartUsername}`, () =>
                        deleteFriendRequest(request.requestId),
                      );
                    }}
                  />
                }
              />
            ))}
          </List>
        </Stack>
      )}

      <Stack gap={2}>
        <Heading level={2}>Your friends</Heading>
        {friends.status === "loading" ? (
          <Text>Loading…</Text>
        ) : friends.status === "error" ? (
          <LoadError message="Could not load your friends." onRetry={reloadFriends} />
        ) : friends.items.length === 0 ? (
          <EmptyState
            title="No friends yet"
            description="Visit a profile to send a friend request."
            isCompact
          />
        ) : (
          <List header={<VisuallyHidden>Your friends</VisuallyHidden>} hasDividers>
            {friends.items.map((friend) => (
              <ListItem
                key={friend.userId}
                label={friend.username}
                endContent={
                  <Stack direction="horizontal" gap={3}>
                    <Link href={`/users/${friend.username}`}>View profile</Link>
                    <Button
                      label="Remove"
                      aria-label={`Remove ${friend.username}`}
                      variant="ghost"
                      onClick={() => {
                        act(`Could not remove ${friend.username} from your friends`, () =>
                          removeFriend(friend.userId),
                        );
                      }}
                    />
                  </Stack>
                }
              />
            ))}
          </List>
        )}
      </Stack>
    </Stack>
  );
}
