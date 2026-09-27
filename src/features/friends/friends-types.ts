/** `social-rest-api.md` §7 — one row of a friend list. */
export interface FriendSummary {
  userId: string;
  username: string;
}

/** `social-rest-api.md` §4. */
export interface PendingRequest {
  requestId: string;
  direction: "INCOMING" | "OUTGOING";
  counterpartUsername: string;
  createdAt: string;
  expiresAt: string;
}

/** `social-rest-api.md` §3 — the request just created, addressed by `recipientUsername`. */
export interface SentFriendRequest {
  requestId: string;
  recipientUsername: string;
  createdAt: string;
  expiresAt: string;
}

/** `social-rest-api.md` §3 — both outcomes are `201`, discriminated by `outcome`. */
export type SendFriendRequestResult =
  | { outcome: "REQUEST_SENT"; friendRequest: SentFriendRequest }
  | { outcome: "FRIENDS"; friend: FriendSummary };
