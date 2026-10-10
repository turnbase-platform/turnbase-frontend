// rest-conventions.md: the API is same-origin with the shell, so requests are relative and
// carry the `turnbase_session` cookie without any credential handling here. The cookie is
// httpOnly — the shell never sees, stores or sends the token itself.

/** RFC 9457 Problem Details (`error-handling.md`). */
export interface Problem {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  errors?: { field: string; message: string }[];
  /** `room-rest-api.md` §7 — millisecond-resolution twin of the `Retry-After` header, on a `503`. */
  retryAfterMs?: number;
}

export class ApiError extends Error {
  readonly status: number;
  readonly problem: Problem;
  /** `rate-limiting.md` §429: the `Retry-After` header, in seconds, when the server sent one. */
  readonly retryAfterSeconds?: number;

  constructor(status: number, problem: Problem, retryAfterSeconds?: number) {
    super(problem.detail ?? problem.title ?? `Request failed with status ${String(status)}`);
    this.name = "ApiError";
    this.status = status;
    this.problem = problem;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/** "14 minutes", "30 seconds" — a wait a person can read, rounded up so it is never too short. */
export function formatWait(seconds: number): string {
  if (seconds < 60) return `${String(Math.max(1, Math.ceil(seconds)))} seconds`;
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `${String(minutes)} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.ceil(minutes / 60);
  return `${String(hours)} hour${hours === 1 ? "" : "s"}`;
}

/** The sentence for a `429`: names the wait when the header gave one, never a vague "a moment". */
export function rateLimitMessage(error: ApiError, what = "attempts"): string {
  const wait = error.retryAfterSeconds;
  return wait === undefined
    ? `Too many ${what}. Please try again later.`
    : `Too many ${what}. Please try again in ${formatWait(wait)}.`;
}

/**
 * AUD-16: the sentence for a refused action, said by its cause. A `4xx` the server explained
 * (`422 business-rule-violation`, `409 conflict`) keeps its own `detail` — that is the real reason
 * ("This room is full."). The classes whose `detail` is deliberately terse or generic are
 * restated in the user's terms, and a failure that never reached the server is not blamed on them.
 */
export function denialMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) {
    return "Could not reach TurnBase. Check your connection and try again.";
  }
  if (error.status === 429) return rateLimitMessage(error, "requests");
  if (error.status === 403) return "You do not have permission to do that.";
  if (error.status === 404) return "This room does not exist, or it has been closed.";
  if (error.status === 503) return "The room is temporarily unavailable. Please try again.";
  if (error.status >= 500) return "Something went wrong on our side. Please try again.";
  return error.problem.detail ?? fallback;
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  /**
   * The caller treats a 401 as an ordinary answer (a wrong password, "no session yet"), not as
   * the session having ended. Without this, every failed login would look like a mid-session
   * expiry and be routed through VW-REDIR-007.
   */
  expectUnauthorized?: boolean;
}

type UnauthorizedListener = () => void;
const listeners = new Set<UnauthorizedListener>();

/**
 * VW-REDIR-007: "any 401 from any request" is heard in one place. The auth context subscribes
 * and clears the cached principal; the route guard then does the redirect. Views never handle
 * a 401 themselves, so none of them can forget to.
 */
export function onUnauthorized(listener: UnauthorizedListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

async function readProblem(response: Response): Promise<Problem> {
  try {
    return (await response.json()) as Problem;
  } catch {
    return { status: response.status };
  }
}

async function doFetch(path: string, options: RequestOptions): Promise<Response> {
  const { method = "GET", body, expectUnauthorized = false } = options;
  const init: RequestInit = { method, credentials: "same-origin", headers: {} };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers = { "Content-Type": "application/json" };
  }
  const response = await fetch(path, init);
  if (!response.ok) {
    if (response.status === 401 && !expectUnauthorized) {
      listeners.forEach((listener) => {
        listener();
      });
    }
    const retryAfter = Number(response.headers.get("Retry-After"));
    throw new ApiError(
      response.status,
      await readProblem(response),
      Number.isFinite(retryAfter) && response.headers.has("Retry-After") ? retryAfter : undefined,
    );
  }
  return response;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await doFetch(path, options);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/**
 * `room-rest-api.md` § *The affinity hint is a response header* — the one caller that needs a
 * response header rather than a body field, so it gets its own entry point instead of widening
 * every other caller's return type for a header nobody else reads.
 */
export async function apiFetchWithHeaders<T>(
  path: string,
  options: RequestOptions = {},
): Promise<[body: T, headers: Headers]> {
  const response = await doFetch(path, options);
  const body = response.status === 204 ? (undefined as T) : ((await response.json()) as T);
  return [body, response.headers];
}
