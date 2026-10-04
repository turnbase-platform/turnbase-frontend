import { useState } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { CheckboxList, CheckboxListItem } from "@astryxdesign/core/CheckboxList";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Stack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { useToast } from "@astryxdesign/core/Toast";
import { useAuth } from "../auth/auth-context";
import { fetchFriends } from "../friends/friendsApi";
import type { FriendSummary } from "../friends/friends-types";
import { ApiError } from "../../shared/api";
import { inviteFriend } from "./roomsApi";

type Friends =
  { status: "loading" } | { status: "error" } | { status: "ready"; items: FriendSummary[] };

interface Outcome {
  name: string;
  failure: string | null;
}

/** `room-invitation-rest-api.md` §5: the documented `4xx`s, said in the host's terms. */
function describeFailure(username: string, error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) return `${username}: only the host can invite players.`;
    if (error.status === 404)
      return `${username}: this room is closed, or the user no longer exists.`;
    if (error.status === 422) return `${username}: you can only invite friends.`;
  }
  return `${username}: the invitation could not be sent.`;
}

/**
 * VW-RLOBBY-005: for a registered host only — removed, not disabled, for a Guest (who cannot have
 * friends). The picker lists the host's friends and sends one invitation per selected friend; the
 * friends it could not reach stay selected, with the reason beside the list.
 */
export function InviteFriendsButton({ roomId }: { roomId: string }) {
  const { principal, tier } = useAuth();
  const showToast = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [friends, setFriends] = useState<Friends>({ status: "loading" });
  const [selected, setSelected] = useState<string[]>([]);
  const [failures, setFailures] = useState<string[]>([]);

  if (tier !== "registered" || !principal) return null;
  const { username } = principal;

  function open() {
    setIsOpen(true);
    setSelected([]);
    setFailures([]);
    setFriends({ status: "loading" });
    fetchFriends(username)
      .then((page) => {
        setFriends({ status: "ready", items: page.content });
      })
      .catch(() => {
        setFriends({ status: "error" });
      });
  }

  function send() {
    setIsBusy(true);
    setFailures([]);
    void Promise.all(
      selected.map((name) =>
        inviteFriend(roomId, name).then(
          (): Outcome => ({ name, failure: null }),
          (error: unknown): Outcome => ({ name, failure: describeFailure(name, error) }),
        ),
      ),
    ).then((results) => {
      setIsBusy(false);
      const sent = results.filter((result) => result.failure === null).map((result) => result.name);
      const failed = results.filter((result) => result.failure !== null);
      if (sent.length > 0) {
        showToast({ type: "info", body: `Invitation sent to ${sent.join(", ")}.` });
      }
      if (failed.length === 0) {
        setIsOpen(false);
        return;
      }
      setSelected(failed.map((result) => result.name));
      setFailures(failed.map((result) => result.failure ?? ""));
    });
  }

  return (
    <>
      <Button label="Invite friends" variant="secondary" onClick={open} />
      <Dialog isOpen={isOpen} onOpenChange={setIsOpen} purpose="form">
        <DialogHeader title="Invite friends" onOpenChange={setIsOpen} />
        <Stack gap={4} padding={4}>
          {friends.status === "loading" && <Text>Loading your friends…</Text>}
          {friends.status === "error" && (
            <Banner status="error" title="Could not load your friends. Please try again." />
          )}
          {friends.status === "ready" && friends.items.length === 0 && (
            <Text>You have no friends to invite yet. Add friends from the Friends page.</Text>
          )}
          {friends.status === "ready" && friends.items.length > 0 && (
            <CheckboxList label="Friends" value={selected} onChange={setSelected}>
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
          <Stack direction="horizontal" gap={2}>
            <Button
              label="Cancel"
              variant="ghost"
              onClick={() => {
                setIsOpen(false);
              }}
            />
            {friends.status === "ready" && friends.items.length > 0 && (
              <Button
                label="Send invitations"
                variant="primary"
                isLoading={isBusy}
                isDisabled={selected.length === 0}
                onClick={send}
              />
            )}
          </Stack>
        </Stack>
      </Dialog>
    </>
  );
}
