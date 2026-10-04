import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
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
import { useAuth } from "../auth/auth-context";
import { NotFoundPage } from "../../app/pages/NotFoundPage";
import { fetchOwnedGames, fetchProfile, type OwnedGame } from "./profileApi";
import type { ProfileResponse } from "./profile-types";
import { LoadError } from "../../shared/LoadError";
import { StatisticsSection } from "./StatisticsSection";
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
  const [attempt, setAttempt] = useState(0);

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
  }, [username, attempt]);

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
        <LoadError
          message="Could not load this profile."
          onRetry={() => {
            setState({ status: "loading" });
            setAttempt((n) => n + 1);
          }}
        />
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
      {/* VW-PROF-006/007: friend actions are Registered-only. The server also sends a Guest
          viewer a `relationshipState`, so the viewer's kind is checked here, not inferred. */}
      {!isOwner && principal?.kind === "REGISTERED" && profile.relationshipState && (
        <RelationshipAction profile={profile} />
      )}
      {isPrivateToViewer ? (
        <Banner status="info" title="This profile is private." />
      ) : (
        <Stack gap={6}>
          {sections.includes("statistics") && <StatisticsSection username={profile.username} />}
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

  function fail(action: string) {
    showToast({ type: "error", body: `Could not ${action}. Please try again.` });
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
            .catch(() => {
              fail("remove this friend");
            });
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
          .catch(() => {
            fail("send the friend request");
          });
      }}
    />
  );
}

type ListState<T> = { status: "loading" } | { status: "loaded"; items: T[] } | { status: "error" };

/** Loads a profile section's list; `retry` re-runs it after a failure. */
function useSectionList<T>(load: () => Promise<T[]>, key: string) {
  const [state, setState] = useState<ListState<T>>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    load()
      .then((items) => {
        if (!cancelled) setState({ status: "loaded", items });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
    // `load` is a fresh closure per render; `key` (the username) is what it depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt]);

  return {
    state,
    retry: () => {
      setState({ status: "loading" });
      setAttempt((n) => n + 1);
    },
  };
}

function FriendsSection({ username }: { username: string }) {
  const { state, retry } = useSectionList<FriendSummary>(
    () => fetchFriends(username).then((page) => page.content),
    username,
  );

  return (
    <Stack gap={2}>
      <Heading level={2}>Friends</Heading>
      {state.status === "loading" && <Text>Loading…</Text>}
      {state.status === "error" && <LoadError message="Could not load friends." onRetry={retry} />}
      {state.status === "loaded" &&
        (state.items.length === 0 ? (
          <EmptyState title="No friends yet" isCompact />
        ) : (
          <List header={<VisuallyHidden>Friends</VisuallyHidden>}>
            {state.items.map((friend) => (
              <ListItem
                key={friend.userId}
                label={friend.username}
                href={`/users/${friend.username}`}
              />
            ))}
          </List>
        ))}
    </Stack>
  );
}

function UploadedGamesSection({ username }: { username: string }) {
  const { state, retry } = useSectionList<OwnedGame>(
    () => fetchOwnedGames(username).then((page) => page.content),
    username,
  );

  return (
    <Stack gap={2}>
      <Heading level={2}>Uploaded games</Heading>
      {state.status === "loading" && <Text>Loading…</Text>}
      {state.status === "error" && (
        <LoadError message="Could not load uploaded games." onRetry={retry} />
      )}
      {state.status === "loaded" &&
        (state.items.length === 0 ? (
          <EmptyState title="No uploaded games yet" isCompact />
        ) : (
          <List header={<VisuallyHidden>Uploaded games</VisuallyHidden>}>
            {state.items.map((game) => (
              <ListItem
                key={game.gameId}
                label={game.title}
                description={game.shortDescription}
                href={`/games/${game.gameId}`}
                endContent={<Badge label={game.badge} />}
              />
            ))}
          </List>
        ))}
    </Stack>
  );
}
