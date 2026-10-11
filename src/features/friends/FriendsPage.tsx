import { FriendsView } from "./FriendsView";
import { useFriends } from "./useFriends";

/** VW-FREN-001…005. */
export function FriendsPage() {
  return <FriendsView friends={useFriends()} />;
}
