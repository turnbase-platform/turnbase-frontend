import { FriendsView, UploadedGamesView } from "./ProfileListViews";
import { useProfileFriends, useUploadedGames } from "./useProfileLists";

/** The Friends section: `useProfileFriends` in its view. */
export function FriendsSection({ username }: { username: string }) {
  return <FriendsView friends={useProfileFriends(username)} />;
}

/** The Uploaded games section: `useUploadedGames` in its view. */
export function UploadedGamesSection({ username }: { username: string }) {
  return <UploadedGamesView games={useUploadedGames(username)} />;
}
