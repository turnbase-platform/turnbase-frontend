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

  constructor(status: number, problem: Problem) {
    super(problem.detail ?? problem.title ?? `Request failed with status ${String(status)}`);
    this.name = "ApiError";
    this.status = status;
    this.problem = problem;
  }
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
    throw new ApiError(response.status, await readProblem(response));
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
