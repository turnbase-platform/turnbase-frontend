import { InviteFriendsView } from "./InviteFriendsView";
import { useInviteFriends } from "./useInviteFriends";

/** VW-RLOBBY-005: the invite picker for a registered host (`useInviteFriends`) in its view. */
export function InviteFriendsButton({ roomId }: { roomId: string }) {
  return <InviteFriendsView invite={useInviteFriends(roomId)} />;
}
