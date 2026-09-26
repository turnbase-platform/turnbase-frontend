// sse-notifications.md and shell-architecture.md §7: one EventSource per tab at
// /api/notifications/stream, carrying two event classes.
//
// The browser reconnects a *transient* error by itself and this module leaves that alone. What
// it adds is the case the browser gives up on: an error that leaves `readyState` CLOSED (an
// HTTP error response, a proxy that reset the stream) is never retried natively, and a shell
// left silently deaf to invitations looks like nothing at all. That case is reopened here with
// exponential backoff and jitter.

export const STREAM_URL = "/api/notifications/stream";

export interface StreamNotification {
  type: string;
  notificationId: string;
  [key: string]: unknown;
}

export interface StreamAlert {
  type: string;
  [key: string]: unknown;
}

export interface StreamHandlers {
  onNotification: (notification: StreamNotification) => void;
  onAlert: (alert: StreamAlert) => void;
}

/** The slice of `EventSource` used — lets tests drive the stream without a network. */
export interface StreamSource {
  readonly readyState: number;
  onopen: ((event: Event) => void) | null;
  onerror: ((event: Event) => void) | null;
  addEventListener: (type: string, listener: (event: MessageEvent<string>) => void) => void;
  close: () => void;
}

export interface StreamEnvironment {
  createSource: (url: string) => StreamSource;
  setTimer: (callback: () => void, delayMs: number) => unknown;
  clearTimer: (handle: unknown) => void;
  random: () => number;
}

const CLOSED = 2;
const BASE_DELAY_MS = 1_000;
const MAX_DELAY_MS = 30_000;
/** Enough to cover any replay window; the set only has to outlive one reconnect. */
const SEEN_LIMIT = 500;

const browserEnvironment: StreamEnvironment = {
  createSource: (url) => new EventSource(url),
  setTimer: (callback, delayMs) => setTimeout(callback, delayMs),
  clearTimer: (handle) => {
    clearTimeout(handle as ReturnType<typeof setTimeout>);
  },
  random: Math.random,
};

/** Full jitter over an exponential ceiling: retries from many tabs must not synchronise. */
export function backoffDelay(attempt: number, random: number): number {
  const ceiling = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** attempt);
  return Math.round(ceiling / 2 + (ceiling / 2) * random);
}

function parse(event: MessageEvent<string>): unknown {
  try {
    return JSON.parse(event.data);
  } catch {
    return null;
  }
}

/** Opens the stream; the returned function closes it for good. */
export function openNotificationStream(
  handlers: StreamHandlers,
  environment: StreamEnvironment = browserEnvironment,
): () => void {
  let source: StreamSource | null = null;
  let timer: unknown = null;
  let attempt = 0;
  let stopped = false;
  const seen = new Set<string>();

  function remember(id: string): boolean {
    if (seen.has(id)) return false;
    seen.add(id);
    if (seen.size > SEEN_LIMIT) {
      const oldest = seen.values().next();
      if (!oldest.done) seen.delete(oldest.value);
    }
    return true;
  }

  function connect() {
    timer = null;
    // Exactly one connection: a stale source is closed before a new one exists.
    source?.close();
    const current = environment.createSource(STREAM_URL);
    source = current;

    current.onopen = () => {
      attempt = 0;
    };
    current.onerror = () => {
      if (stopped || current.readyState !== CLOSED) return; // transient — the browser retries
      current.close();
      timer = environment.setTimer(connect, backoffDelay(attempt, environment.random()));
      attempt += 1;
    };
    current.addEventListener("notification", (event) => {
      const notification = parse(event) as StreamNotification | null;
      // At-least-once delivery: the same notification can arrive again after a reconnect.
      if (notification && remember(notification.notificationId)) {
        handlers.onNotification(notification);
      }
    });
    // Alerts carry no id and are never replayed, so there is nothing to dedupe — the
    // guarantee against doubles is the single connection above.
    current.addEventListener("alert", (event) => {
      const alert = parse(event) as StreamAlert | null;
      if (alert) handlers.onAlert(alert);
    });
  }

  connect();

  return () => {
    stopped = true;
    if (timer !== null) environment.clearTimer(timer);
    source?.close();
    source = null;
  };
}
