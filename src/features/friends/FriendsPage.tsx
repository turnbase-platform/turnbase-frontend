import { useEffect, useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Heading } from "@astryxdesign/core/Heading";
import { Link } from "@astryxdesign/core/Link";
import { List, ListItem } from "@astryxdesign/core/List";
import { Stack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { useToast } from "@astryxdesign/core/Toast";
import { useAuth } from "../auth/auth-context";
import {
  acceptFriendRequest,
  deleteFriendRequest,
  fetchFriends,
  fetchPendingRequests,
  removeFriend,
} from "./friendsApi";
import type { FriendSummary, PendingRequest } from "./friends-types";

/** VW-FREN-001…005. */
export function FriendsPage() {
  const { principal } = useAuth();
  const username = principal?.username ?? "";
  const [friends, setFriends] = useState<FriendSummary[] | null>(null);
  const [requests, setRequests] = useState<PendingRequest[] | null>(null);
  const showToast = useToast();

  function reloadFriends() {
    fetchFriends(username)
      .then((page) => {
        setFriends(page.content);
      })
      .catch(fail);
  }

  function reloadRequests() {
    fetchPendingRequests()
      .then((page) => {
        setRequests(page.content);
      })
      .catch(fail);
  }

  useEffect(() => {
    reloadFriends();
    reloadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  function fail() {
    showToast({ type: "error", body: "Could not complete that action. Please try again." });
  }

  const incoming = requests?.filter((request) => request.direction === "INCOMING") ?? [];
  const outgoing = requests?.filter((request) => request.direction === "OUTGOING") ?? [];

  return (
    <Stack gap={6} padding={6}>
      <Heading level={1}>Friends</Heading>

      <Stack gap={2}>
        <Heading level={2}>Incoming requests</Heading>
        {requests === null ? (
          <Text>Loading…</Text>
        ) : incoming.length === 0 ? (
          <EmptyState title="No pending requests" isCompact />
        ) : (
          <List header="Incoming requests" hasDividers>
            {incoming.map((request) => (
              <ListItem
                key={request.requestId}
                label={request.counterpartUsername}
                endContent={
                  <Stack direction="horizontal" gap={2}>
                    <Button
                      label="Accept"
                      variant="primary"
                      onClick={() => {
                        acceptFriendRequest(request.requestId)
                          .then(reloadFriends)
                          .then(reloadRequests)
                          .catch(fail);
                      }}
                    />
                    <Button
                      label="Decline"
                      variant="secondary"
                      onClick={() => {
                        deleteFriendRequest(request.requestId).then(reloadRequests).catch(fail);
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
          <List header="Sent requests" hasDividers>
            {outgoing.map((request) => (
              <ListItem
                key={request.requestId}
                label={request.counterpartUsername}
                endContent={
                  <Button
                    label="Cancel"
                    variant="ghost"
                    onClick={() => {
                      deleteFriendRequest(request.requestId).then(reloadRequests).catch(fail);
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
        {friends === null ? (
          <Text>Loading…</Text>
        ) : friends.length === 0 ? (
          <EmptyState
            title="No friends yet"
            description="Visit a profile to send a friend request."
            isCompact
          />
        ) : (
          <List header="Your friends" hasDividers>
            {friends.map((friend) => (
              <ListItem
                key={friend.userId}
                label={friend.username}
                endContent={
                  <Stack direction="horizontal" gap={3}>
                    <Link href={`/users/${friend.username}`}>View profile</Link>
                    <Button
                      label="Remove"
                      variant="ghost"
                      onClick={() => {
                        removeFriend(friend.userId).then(reloadFriends).catch(fail);
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
