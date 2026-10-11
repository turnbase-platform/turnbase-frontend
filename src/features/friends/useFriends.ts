import { useEffect, useState } from "react";
import { useToast } from "@astryxdesign/core/Toast";
import { ApiError } from "../../shared/api";
import { useAuth } from "../auth/auth-context";
import { subscribeFriendChanges } from "../notifications/liveSignal";
import {
  acceptFriendRequest,
  deleteFriendRequest,
  fetchFriends,
  fetchPendingRequests,
  removeFriend,
} from "./friendsApi";
import type { FriendSummary, PendingRequest } from "./friends-types";

export type Loaded<T> =
  { status: "loading" } | { status: "error" } | { status: "ready"; items: T[] };

export interface Friends {
  friends: Loaded<FriendSummary>;
  requests: Loaded<PendingRequest>;
  incoming: PendingRequest[];
  outgoing: PendingRequest[];
  reloadFriends: () => void;
  reloadRequests: () => void;
  accept: (request: PendingRequest) => void;
  /** Declines an incoming request. */
  decline: (request: PendingRequest) => void;
  /** Cancels a request this user sent. */
  cancel: (request: PendingRequest) => void;
  remove: (friend: FriendSummary) => void;
}

/**
 * VW-FREN-001…005. Both lists are re-read after every action, on a pushed `FRIEND_*`
 * notification and on a stream (re)connect — never polled, never patched locally.
 */
export function useFriends(): Friends {
  const { principal } = useAuth();
  const username = principal?.username ?? "";
  const [friends, setFriends] = useState<Loaded<FriendSummary>>({ status: "loading" });
  const [requests, setRequests] = useState<Loaded<PendingRequest>>({ status: "loading" });
  const showToast = useToast();

  function reloadFriends() {
    fetchFriends(username)
      .then((page) => {
        setFriends({ status: "ready", items: page.content });
      })
      .catch(() => {
        setFriends({ status: "error" });
      });
  }

  function reloadRequests() {
    fetchPendingRequests()
      .then((page) => {
        setRequests({ status: "ready", items: page.content });
      })
      .catch(() => {
        setRequests({ status: "error" });
      });
  }

  useEffect(() => {
    reloadFriends();
    reloadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  useEffect(
    () =>
      subscribeFriendChanges(() => {
        reloadFriends();
        reloadRequests();
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [username],
  );

  /** Runs one action; a failure names it, then both lists are re-read so a stale row goes away. */
  function act(failure: string, run: () => Promise<unknown>) {
    run()
      .catch((error: unknown) => {
        const detail = error instanceof ApiError && error.status === 422 ? ` ${error.message}` : "";
        showToast({ type: "error", body: `${failure}.${detail}` });
      })
      .finally(() => {
        reloadFriends();
        reloadRequests();
      });
  }

  const all = requests.status === "ready" ? requests.items : [];

  return {
    friends,
    requests,
    incoming: all.filter((request) => request.direction === "INCOMING"),
    outgoing: all.filter((request) => request.direction === "OUTGOING"),
    reloadFriends,
    reloadRequests,
    accept: (request) => {
      act(`Could not accept ${request.counterpartUsername}'s friend request`, () =>
        acceptFriendRequest(request.requestId),
      );
    },
    decline: (request) => {
      act(`Could not decline ${request.counterpartUsername}'s friend request`, () =>
        deleteFriendRequest(request.requestId),
      );
    },
    cancel: (request) => {
      act(`Could not cancel your request to ${request.counterpartUsername}`, () =>
        deleteFriendRequest(request.requestId),
      );
    },
    remove: (friend) => {
      act(`Could not remove ${friend.username} from your friends`, () =>
        removeFriend(friend.userId),
      );
    },
  };
}
