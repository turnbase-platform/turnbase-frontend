import { Badge } from "@astryxdesign/core/Badge";
import { Card } from "@astryxdesign/core/Card";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Link } from "@astryxdesign/core/Link";
import { Text } from "@astryxdesign/core/Text";
import { GameCover, Person } from "../../ui";
import { LoadError } from "../../shared/LoadError";
import type { FriendSummary } from "../friends/friends-types";
import type { OwnedGame } from "./profileApi";
import type { ListState } from "./useProfileLists";
import styles from "./ProfileListViews.module.css";

interface Section<T> {
  state: ListState<T>;
  retry: () => void;
}

/** FR-PROF friends tab: a card per friend, no presence indicator (ADR-0017 §4). */
export function FriendsView({ friends }: { friends: Section<FriendSummary> }) {
  const { state, retry } = friends;
  if (state.status === "loading") return <Text>Loading…</Text>;
  if (state.status === "error")
    return <LoadError message="Could not load friends." onRetry={retry} />;
  if (state.items.length === 0) return <EmptyState title="No friends yet" isCompact />;
  return (
    <ul className={styles.people} aria-label="Friends">
      {state.items.map((friend, index) => (
        <li key={friend.userId} style={{ "--i": index } as React.CSSProperties}>
          <Card padding={3}>
            <div className={styles.person}>
              <Person name={friend.username} />
              <Link href={`/users/${friend.username}`} color="inherit">
                <Text weight="semibold">{friend.username}</Text>
              </Link>
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}

/** The profile's uploaded games, each linking to its catalog page. */
export function UploadedGamesView({ games }: { games: Section<OwnedGame> }) {
  const { state, retry } = games;
  if (state.status === "loading") return <Text>Loading…</Text>;
  if (state.status === "error") {
    return <LoadError message="Could not load uploaded games." onRetry={retry} />;
  }
  if (state.items.length === 0) return <EmptyState title="No uploaded games yet" isCompact />;
  return (
    <ul className={styles.games} aria-label="Uploaded games">
      {state.items.map((game, index) => (
        <li key={game.gameId} style={{ "--i": index } as React.CSSProperties}>
          <Card padding={0}>
            <div className={styles.game}>
              <GameCover gameId={game.gameId} className={styles.thumb} />
              <div className={styles.text}>
                <Link href={`/games/${game.gameId}`} color="inherit">
                  <Text weight="semibold">{game.title}</Text>
                </Link>
                <Text type="supporting" color="secondary">
                  {game.shortDescription}
                </Text>
              </div>
              <Badge label={game.badge} />
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}
