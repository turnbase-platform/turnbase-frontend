import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { CheckboxList, CheckboxListItem } from "@astryxdesign/core/CheckboxList";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Text } from "@astryxdesign/core/Text";
import type { InviteFriends } from "./useInviteFriends";
import styles from "./InviteFriendsView.module.css";

/** VW-RLOBBY-005: the button and its friend picker. Removed, not disabled, for a Guest. */
export function InviteFriendsView({ invite }: { invite: InviteFriends }) {
  if (!invite.available) return null;
  const { friends, selected, failures, isBusy } = invite;
  const hasFriends = friends.status === "ready" && friends.items.length > 0;

  return (
    <>
      <Button label="Invite friends" variant="secondary" onClick={invite.open} />
      <Dialog isOpen={invite.isOpen} onOpenChange={invite.setIsOpen} purpose="form">
        <DialogHeader title="Invite friends" onOpenChange={invite.setIsOpen} />
        <div className={styles.body}>
          {friends.status === "loading" && <Text>Loading your friends…</Text>}
          {friends.status === "error" && (
            <Banner status="error" title="Could not load your friends. Please try again." />
          )}
          {friends.status === "ready" && friends.items.length === 0 && (
            <Text>You have no friends to invite yet. Add friends from the Friends page.</Text>
          )}
          {friends.status === "ready" && hasFriends && (
            <CheckboxList label="Friends" value={selected} onChange={invite.setSelected}>
              {friends.items.map((friend) => (
                <CheckboxListItem
                  key={friend.userId}
                  label={friend.username}
                  value={friend.username}
                />
              ))}
            </CheckboxList>
          )}
          {failures.map((failure) => (
            <Banner key={failure} status="error" title={failure} />
          ))}
          <div className={styles.actions}>
            <Button
              label="Cancel"
              variant="ghost"
              onClick={() => {
                invite.setIsOpen(false);
              }}
            />
            {hasFriends && (
              <Button
                label="Send invitations"
                variant="primary"
                isLoading={isBusy}
                isDisabled={selected.length === 0}
                onClick={invite.send}
              />
            )}
          </div>
        </div>
      </Dialog>
    </>
  );
}
