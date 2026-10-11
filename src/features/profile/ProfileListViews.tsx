import { Avatar } from "@astryxdesign/core/Avatar";
import { Badge } from "@astryxdesign/core/Badge";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { List, ListItem } from "@astryxdesign/core/List";
import { Text } from "@astryxdesign/core/Text";
import { VisuallyHidden } from "@astryxdesign/core/VisuallyHidden";
import { SectionCard } from "../../ui";
import { LoadError } from "../../shared/LoadError";
import type { FriendSummary } from "../friends/friends-types";
import type { OwnedGame } from "./profileApi";
import type { ListState } from "./useProfileLists";

interface Section<T> {
  state: ListState<T>;
  retry: () => void;
}

/** FR-PROF friends section: one list, no presence indicator (ADR-0017 §4). */
export function FriendsView({ friends }: { friends: Section<FriendSummary> }) {
  const { state, retry } = friends;
  return (
    <SectionCard title="Friends">
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
                startContent={<Avatar name={friend.username} size="sm" tooltip={false} />}
              />
            ))}
          </List>
        ))}
    </SectionCard>
  );
}

/** The profile's uploaded games, each linking to its catalog page. */
export function UploadedGamesView({ games }: { games: Section<OwnedGame> }) {
  const { state, retry } = games;
  return (
    <SectionCard title="Uploaded games">
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
    </SectionCard>
  );
}
