import { useState } from "react";
import { useToast } from "@astryxdesign/core/Toast";
import { ApiError } from "../../shared/api";
import { useAuth } from "../auth/auth-context";
import { fetchFriends } from "../friends/friendsApi";
import type { FriendSummary } from "../friends/friends-types";
import { inviteFriend } from "./roomsApi";

export type Friends =
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
 * VW-RLOBBY-005: for a registered host only — `available` is false for a Guest (who cannot have
 * friends). The picker lists the host's friends and sends one invitation per selected friend; the
 * friends it could not reach stay selected, with the reason beside the list.
 */
export function useInviteFriends(roomId: string) {
  const { principal, tier } = useAuth();
  const showToast = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [friends, setFriends] = useState<Friends>({ status: "loading" });
  const [selected, setSelected] = useState<string[]>([]);
  const [failures, setFailures] = useState<string[]>([]);

  return {
    available: tier === "registered" && principal !== null,
    isOpen,
    isBusy,
    friends,
    selected,
    failures,
    setIsOpen,
    setSelected,
    open: () => {
      if (!principal) return;
      setIsOpen(true);
      setSelected([]);
      setFailures([]);
      setFriends({ status: "loading" });
      fetchFriends(principal.username)
        .then((page) => {
          setFriends({ status: "ready", items: page.content });
        })
        .catch(() => {
          setFriends({ status: "error" });
        });
    },
    send: () => {
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
        const sent = results
          .filter((result) => result.failure === null)
          .map((result) => result.name);
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
    },
  };
}

export type InviteFriends = ReturnType<typeof useInviteFriends>;
