import { apiFetch } from "../../shared/api";
import type { ListEnvelope } from "../../shared/pagination";
import type { FriendSummary, PendingRequest, SendFriendRequestResult } from "./friends-types";

/** `social-rest-api.md` §7. */
export function fetchFriends(username: string): Promise<ListEnvelope<FriendSummary>> {
  return apiFetch<ListEnvelope<FriendSummary>>(
    `/api/users/${encodeURIComponent(username)}/friends`,
  );
}

/** `social-rest-api.md` §4. */
export function fetchPendingRequests(): Promise<ListEnvelope<PendingRequest>> {
  return apiFetch<ListEnvelope<PendingRequest>>("/api/friend-requests");
}

/** `social-rest-api.md` §3. */
export function sendFriendRequest(recipientUsername: string): Promise<SendFriendRequestResult> {
  return apiFetch<SendFriendRequestResult>("/api/friend-requests", {
    method: "POST",
    body: { recipientUsername },
  });
}

/** `social-rest-api.md` §5. */
export function acceptFriendRequest(requestId: string): Promise<{ friend: FriendSummary }> {
  return apiFetch<{ friend: FriendSummary }>(`/api/friend-requests/${requestId}/accept`, {
    method: "POST",
  });
}

/** `social-rest-api.md` §6 — cancel (sender) or decline (recipient), same route. */
export function deleteFriendRequest(requestId: string): Promise<undefined> {
  return apiFetch<undefined>(`/api/friend-requests/${requestId}`, { method: "DELETE" });
}

/** `social-rest-api.md` §8. */
export function removeFriend(userId: string): Promise<undefined> {
  return apiFetch<undefined>(`/api/users/me/friends/${userId}`, { method: "DELETE" });
}
