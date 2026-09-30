import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Heading } from "@astryxdesign/core/Heading";
import { Link } from "@astryxdesign/core/Link";
import { List, ListItem } from "@astryxdesign/core/List";
import { Stack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { useToast } from "@astryxdesign/core/Toast";
import { ApiError } from "../../shared/api";
import { useAuth } from "../auth/auth-context";
import { NotFoundPage } from "../../app/pages/NotFoundPage";
import { fetchOwnedGames, fetchProfile, type OwnedGame } from "./profileApi";
import type { ProfileResponse } from "./profile-types";
import { HistorySection } from "../history/HistorySection";
import { fetchFriends, removeFriend, sendFriendRequest } from "../friends/friendsApi";
import type { FriendSummary } from "../friends/friends-types";

type LoadState =
  | { status: "loading" }
  | { status: "loaded"; profile: ProfileResponse }
  | { status: "not-found" }
  | { status: "error" };

/** VW-PROF-001…008 / FR-PROF-001…008, FR-ACCT-009…010, FR-GUEST-010. */
export function ProfilePage() {
  const { username = "" } = useParams();
  // Keyed by username so navigating between profiles remounts this with fresh "loading" state
  // instead of resetting it inside an effect.
  return <ProfileForUsername key={username} username={username} />;
}

function ProfileForUsername({ username }: { username: string }) {
  const { principal } = useAuth();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetchProfile(username)
      .then((profile) => {
        if (!cancelled) setState({ status: "loaded", profile });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState(
          error instanceof ApiError && error.status === 404
            ? { status: "not-found" }
            : { status: "error" },
        );
      });
    return () => {
      cancelled = true;
    };
  }, [username]);

  if (state.status === "loading") {
    return (
      <Stack gap={2} padding={6}>
        <Text>Loading…</Text>
      </Stack>
    );
  }

  if (state.status === "not-found") return <NotFoundPage />;

  if (state.status === "error") {
    return (
      <Stack gap={2} padding={6}>
        <Heading level={1}>{username}</Heading>
        <Banner status="error" title="Could not load this profile. Please try again." />
      </Stack>
    );
  }

  const { profile } = state;

  // FR-ACCT-009: the soft-deleted placeholder — no other information shown.
  if (profile.deleted) {
    return (
      <Stack gap={2} padding={6}>
        <Heading level={1}>{profile.username}</Heading>
        <Text>This account no longer exists.</Text>
      </Stack>
    );
  }

  // FR-GUEST-010 / FR-PROF-002: a guest profile shows only the username, to anyone.
  if (profile.kind !== "REGISTERED") {
    return (
      <Stack gap={2} padding={6}>
        <Heading level={1}>{profile.username}</Heading>
      </Stack>
    );
  }

  const isOwner = principal?.username === profile.username;
  const sections = profile.visibleSections ?? [];
  // FR-PROF-007 exempts the owner: the server only ever sends an empty `visibleSections` for a
  // private profile to a non-owner viewer, so an empty array here can only be that case.
  const isPrivateToViewer = profile.profilePrivate === true && sections.length === 0;

  return (
    <Stack gap={4} padding={6}>
      <Stack direction="horizontal" gap={3}>
        <Heading level={1}>{profile.username}</Heading>
        {isOwner && <Link href="/settings">Edit profile</Link>}
      </Stack>
      {!isOwner && profile.relationshipState && <RelationshipAction profile={profile} />}
      {isPrivateToViewer ? (
        <Banner status="info" title="This profile is private." />
      ) : (
        <Stack gap={6}>
          {sections.includes("statistics") && (
            <Stack gap={2}>
              <Heading level={2}>Statistics</Heading>
              <Text>Coming soon.</Text>
            </Stack>
          )}
          {sections.includes("gameHistory") && <HistorySection username={profile.username} />}
          {sections.includes("friends") && <FriendsSection username={profile.username} />}
          {sections.includes("uploadedGames") && (
            <UploadedGamesSection username={profile.username} />
          )}
        </Stack>
      )}
    </Stack>
  );
}

function RelationshipAction({ profile }: { profile: ProfileResponse }) {
  const [state, setState] = useState(profile.relationshipState);
  const [isBusy, setIsBusy] = useState(false);
  const showToast = useToast();

  function fail() {
    showToast({ type: "error", body: "Could not complete that action. Please try again." });
    setIsBusy(false);
  }

  if (state === "FRIENDS") {
    return (
      <Button
        label="Remove friend"
        variant="secondary"
        isLoading={isBusy}
        onClick={() => {
          if (!profile.userId) return;
          setIsBusy(true);
          removeFriend(profile.userId)
            .then(() => {
              setState("NONE");
              setIsBusy(false);
            })
            .catch(fail);
        }}
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
    <Button
      label="Add friend"
      variant="primary"
      isLoading={isBusy}
      onClick={() => {
        setIsBusy(true);
        sendFriendRequest(profile.username)
          .then((result) => {
            setState(result.outcome === "FRIENDS" ? "FRIENDS" : "REQUEST_SENT");
            setIsBusy(false);
          })
          .catch(fail);
      }}
    />
  );
}

function FriendsSection({ username }: { username: string }) {
  const [friends, setFriends] = useState<FriendSummary[] | null>(null);

  useEffect(() => {
    fetchFriends(username)
      .then((page) => {
        setFriends(page.content);
      })
      .catch(() => {
        setFriends([]);
      });
  }, [username]);

  return (
    <Stack gap={2}>
      <Heading level={2}>Friends</Heading>
      {friends === null ? (
        <Text>Loading…</Text>
      ) : friends.length === 0 ? (
        <EmptyState title="No friends yet" isCompact />
      ) : (
        <List header="Friends">
          {friends.map((friend) => (
            <ListItem
              key={friend.userId}
              label={friend.username}
              href={`/users/${friend.username}`}
            />
          ))}
        </List>
      )}
    </Stack>
  );
}

function UploadedGamesSection({ username }: { username: string }) {
  const [games, setGames] = useState<OwnedGame[] | null>(null);

  useEffect(() => {
    fetchOwnedGames(username)
      .then((page) => {
        setGames(page.content);
      })
      .catch(() => {
        setGames([]);
      });
  }, [username]);

  return (
    <Stack gap={2}>
      <Heading level={2}>Uploaded games</Heading>
      {games === null ? (
        <Text>Loading…</Text>
      ) : games.length === 0 ? (
        <EmptyState title="No uploaded games yet" isCompact />
      ) : (
        <List header="Uploaded games">
          {games.map((game) => (
            <ListItem
              key={game.gameId}
              label={game.title}
              description={game.shortDescription}
              href={`/games/${game.gameId}`}
              endContent={<Badge label={game.badge} />}
            />
          ))}
        </List>
      )}
    </Stack>
  );
}
