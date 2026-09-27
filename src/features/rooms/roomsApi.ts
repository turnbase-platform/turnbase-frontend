import { ApiError, apiFetch, apiFetchWithHeaders } from "../../shared/api";
import type { JoinRoomResult, RoomListEnvelope, RoomResource } from "./rooms-types";

export interface ListRoomsParams {
  search?: string;
  status?: ("LOBBY" | "IN_PROGRESS")[];
  minPlayers?: number;
  maxPlayers?: number;
  playerCountMin?: number;
  playerCountMax?: number;
  inviteCode?: string;
  sort?: string;
  page?: number;
  size?: number;
}

function queryString(params: ListRoomsParams): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      value.forEach((entry) => {
        search.append(key, String(entry));
      });
    } else {
      search.set(key, String(value));
    }
  }
  const string = search.toString();
  return string.length > 0 ? `?${string}` : "";
}

/** `room-rest-api.md` §3. */
export function listRooms(params: ListRoomsParams = {}): Promise<RoomListEnvelope> {
  return apiFetch<RoomListEnvelope>(`/api/rooms${queryString(params)}`);
}

/** `room-rest-api.md` §3.1 — never `404`; zero or one full room resource. */
export function resolveInviteCode(inviteCode: string): Promise<RoomListEnvelope> {
  return listRooms({ inviteCode });
}

/** `room-rest-api.md` §4. */
export async function getRoom(
  roomId: string,
): Promise<{ room: RoomResource; instanceHint: string | null }> {
  const [room, headers] = await apiFetchWithHeaders<RoomResource>(
    `/api/rooms/${encodeURIComponent(roomId)}`,
  );
  return { room, instanceHint: headers.get("X-TurnBase-Room-Instance") };
}

/** `room-rest-api.md` §2. */
export async function createRoom(request: {
  gameId: string;
  visibility: "PUBLIC" | "FRIENDS_ONLY" | "INVITE_ONLY";
  spectatingEnabled?: boolean;
}): Promise<{ room: RoomResource; instanceHint: string | null }> {
  const [room, headers] = await apiFetchWithHeaders<RoomResource>("/api/rooms", {
    method: "POST",
    body: request,
  });
  return { room, instanceHint: headers.get("X-TurnBase-Room-Instance") };
}

/** Attempts left before a repeatedly-`503` claim is surfaced rather than retried forever. */
const MAX_JOIN_ATTEMPTS = 10;

function defaultWait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * `room-rest-api.md` §5 and § *The `503` retry*. A claim that could not be confirmed answers
 * `503` with `retryAfterMs` — "not here yet", not "no" — so this retries internally rather than
 * handing the caller a failure for a condition the join flow itself resolves on the next attempt.
 */
export async function joinRoom(
  roomId: string,
  role: "PLAYER" | "SPECTATOR",
  options: { inviteCode?: string; wait?: (ms: number) => Promise<void> } = {},
): Promise<{ result: JoinRoomResult; instanceHint: string | null }> {
  const { inviteCode, wait = defaultWait } = options;
  const query = inviteCode ? `?inviteCode=${encodeURIComponent(inviteCode)}` : "";
  for (let attempt = 0; attempt < MAX_JOIN_ATTEMPTS; attempt += 1) {
    try {
      const [result, headers] = await apiFetchWithHeaders<JoinRoomResult>(
        `/api/rooms/${encodeURIComponent(roomId)}/participants${query}`,
        { method: "POST", body: { role } },
      );
      return { result, instanceHint: headers.get("X-TurnBase-Room-Instance") };
    } catch (error) {
      if (
        !(error instanceof ApiError) ||
        error.status !== 503 ||
        error.problem.retryAfterMs === undefined
      ) {
        throw error;
      }
      await wait(error.problem.retryAfterMs);
    }
  }
  throw new ApiError(503, {
    status: 503,
    title: "Room Temporarily Unavailable",
    detail: `Gave up after ${String(MAX_JOIN_ATTEMPTS)} retries.`,
  });
}

/** `room-rest-api.md` §6. Idempotent — leaving a room the caller is not in is also `204`. */
export function leaveRoom(roomId: string): Promise<undefined> {
  return apiFetch<undefined>(`/api/rooms/${encodeURIComponent(roomId)}/participants/me`, {
    method: "DELETE",
  });
}
