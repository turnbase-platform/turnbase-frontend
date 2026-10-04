import { Client, type IFrame } from "@stomp/stompjs";
import type {
  ChatMessageEnvelope,
  RoomErrorEnvelope,
  RoomEventEnvelope,
  RoomStateEnvelope,
  RoomStateSnapshot,
} from "./rooms-types";

const BASE_DELAY_MS = 1_000;
const MAX_DELAY_MS = 30_000;
/** Retries of an attach the Tier 6 limiter dropped, before the view is told to ask the user. */
export const MAX_RATE_LIMIT_RETRIES = 4;
/**
 * How long an attach may stay incomplete before it is treated as dropped. The limiter tells the
 * client at most once a second per bucket, and a dropped `SUBSCRIBE` of `/user/queue/errors`
 * means it cannot tell at all (`rate-limiting.md` Tier 6), so the error frame is not enough.
 */
export const ATTACH_WATCHDOG_MS = 4_000;
/** One `snapshot` token (`rate-limiting.md` Tier 6) — a retry sooner than this is dropped again. */
const SNAPSHOT_REFILL_MS = 3_000;

/**
 * Full jitter over an exponential ceiling — the same formula as
 * `notifications/notificationStream.ts`'s `backoffDelay`. `shell-architecture.md` §4 requires
 * jitter (a rolling deploy disconnects every client at once) and `@stomp/stompjs`'s own
 * `reconnectDelay`/`reconnectTimeMode` give plain exponential growth with no randomisation, so
 * the built-in reconnect is disabled (`reconnectDelay: 0`) and this drives `activate()` instead.
 */
export function backoffDelay(attempt: number, random: number): number {
  const ceiling = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** attempt);
  return Math.round(ceiling / 2 + (ceiling / 2) * random);
}

export type ReconcileOutcome = "apply" | "discard" | "resync";

/**
 * `room-websocket.md` § Client Reconciliation — the V2 table. Only ever called for
 * `/topic/room.{roomId}` deltas: chat carries `version: null` on separate topics and is routed
 * to `onChat` directly, never through this comparison (`room-chat-websocket.md` § Message
 * Envelope and Versioning, IR-08).
 */
export function reconcileVersion(localVersion: number, deltaVersion: number): ReconcileOutcome {
  if (deltaVersion === localVersion + 1) return "apply";
  if (deltaVersion <= localVersion) return "discard";
  return "resync";
}

export interface RoomConnectionHandlers {
  onSnapshot: (snapshot: RoomStateSnapshot, version: number) => void;
  onEvent: (envelope: RoomEventEnvelope) => void;
  onChat: (envelope: ChatMessageEnvelope) => void;
  onError: (error: RoomErrorEnvelope["payload"]) => void;
  onConnectionChange?: (connected: boolean) => void;
  /**
   * `true` once an attach dropped by `RATE_LIMIT_EXCEEDED` has used up its retries; `false` again
   * when the stream delivers or the user retries.
   */
  onGameStalled?: (stalled: boolean) => void;
}

interface StompSubscriptionLike {
  unsubscribe: () => void;
}

/**
 * The slice of `@stomp/stompjs`'s `Client` this module drives — lets tests supply a fake with no
 * network, the same testability shape as `notificationStream.ts`'s `StreamSource`.
 */
export interface StompClientLike {
  activate: () => void;
  deactivate: () => void;
  publish: (params: { destination: string; body: string }) => void;
  subscribe: (
    destination: string,
    callback: (message: { body: string }) => void,
  ) => StompSubscriptionLike;
  readonly connected: boolean;
  onConnect: ((frame: IFrame) => void) | (() => void);
  onWebSocketClose: (evt: unknown) => void;
}

export interface RoomSocketEnvironment {
  createClient: (brokerURL: string) => StompClientLike;
  setTimer: (callback: () => void, delayMs: number) => unknown;
  clearTimer: (handle: unknown) => void;
  random: () => number;
  randomId: () => string;
}

function wsOrigin(): string {
  return `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}`;
}

/** `room-websocket.md` § *Routing on join* — the affinity hint as a query parameter. */
export function brokerUrl(instanceHint: string | null): string {
  const base = `${wsOrigin()}/ws`;
  return instanceHint ? `${base}?instance=${encodeURIComponent(instanceHint)}` : base;
}

const browserEnvironment: RoomSocketEnvironment = {
  createClient: (url) =>
    new Client({
      brokerURL: url,
      heartbeatIncoming: 10_000,
      heartbeatOutgoing: 10_000,
      reconnectDelay: 0,
    }),
  setTimer: (callback, delayMs) => setTimeout(callback, delayMs),
  clearTimer: (handle) => {
    clearTimeout(handle as ReturnType<typeof setTimeout>);
  },
  random: Math.random,
  randomId: () => crypto.randomUUID(),
};

export interface RoomMembership {
  isPlayer: boolean;
  teamId: string | null;
}

/** A game-stream message as it arrives, before the relay has looked at it — untrusted shape. */
export type GameStreamListener = (raw: unknown) => void;

export interface RoomConnection {
  /**
   * Subscribes the game destinations for `sessionId` and then requests the sync snapshot —
   * subscribe-before-sync is what makes catch-up race-free (`websocket.md` § Catch-up). Repeated
   * automatically after every reconnect. Returns the detach function.
   */
  attachGame: (
    sessionId: string,
    teamId: string | null,
    listener: GameStreamListener,
  ) => () => void;
  /** `SUBMIT_ACTION` on `/app/game.{sessionId}.action`; never carries player identity (FR-FA-002). */
  submitGameAction: (payload: unknown) => void;
  requestRoomState: () => void;
  /** The user's retry after the automatic ones ran out (`onGameStalled(true)`). */
  retryAttach: () => void;
  sendMemberCommand: (type: string, payload?: unknown) => void;
  sendHostCommand: (type: string, payload?: unknown) => void;
  sendChatMessage: (channel: "ROOM" | "TEAM", text: string) => void;
  /** The chat/team subscriptions depend on role and team, both of which can change mid-session
   * (`SWITCH_TO_SPECTATOR`/`SWITCH_TO_PLAYER`, `PLAYER_REASSIGNED`) — the caller reports the new
   * membership here rather than this module inferring it from event payloads it does not own. */
  setMembership: (membership: RoomMembership) => void;
  close: () => void;
}

/**
 * Opens the one STOMP connection for a room (`room-websocket.md` § Snapshot Delivery) and keeps
 * `localVersion` reconciled against every subsequent delta on `/topic/room.{roomId}`.
 */
export function openRoomConnection(
  roomId: string,
  instanceHint: string | null,
  initialMembership: RoomMembership,
  handlers: RoomConnectionHandlers,
  environment: RoomSocketEnvironment = browserEnvironment,
): RoomConnection {
  let client: StompClientLike | null = null;
  let localVersion: number | null = null;
  let awaitingSnapshot = false;
  let attempt = 0;
  let stopped = false;
  let timer: unknown = null;
  let membership = initialMembership;
  let chatSubscription: StompSubscriptionLike | null = null;
  let teamSubscription: StompSubscriptionLike | null = null;
  let game: { sessionId: string; teamId: string | null; listener: GameStreamListener } | null =
    null;
  let gameSubscriptions: StompSubscriptionLike[] = [];
  let baseSubscriptions: StompSubscriptionLike[] = [];
  let gameDelivered = false;
  let rateLimitRetries = 0;
  let recoveryTimer: unknown = null;
  let watchdogTimer: unknown = null;

  function parseOrDrop(body: string): unknown {
    try {
      return JSON.parse(body) as unknown;
    } catch {
      return undefined;
    }
  }

  function syncGameSubscriptions(current: StompClientLike) {
    gameSubscriptions.forEach((subscription) => {
      subscription.unsubscribe();
    });
    gameSubscriptions = [];
    if (!game) return;
    const attached = game;
    gameDelivered = false;
    const deliver = (message: { body: string }) => {
      if (!gameDelivered) {
        gameDelivered = true;
        rateLimitRetries = 0;
        handlers.onGameStalled?.(false);
      }
      attached.listener(parseOrDrop(message.body));
    };
    gameSubscriptions.push(current.subscribe(`/topic/game.${attached.sessionId}`, deliver));
    if (attached.teamId) {
      gameSubscriptions.push(
        current.subscribe(`/topic/game.${attached.sessionId}.team.${attached.teamId}`, deliver),
      );
    }
    gameSubscriptions.push(current.subscribe("/user/queue/game", deliver));
    send(`/app/game.${attached.sessionId}.sync`, "REQUEST_GAME_SYNC");
  }

  function send(destination: string, type: string, payload?: unknown) {
    if (!client?.connected) return;
    client.publish({
      destination,
      body: JSON.stringify({
        type,
        correlationId: environment.randomId(),
        ...(payload !== undefined ? { payload } : {}),
      }),
    });
  }

  function requestRoomState() {
    send(`/app/room.${roomId}.member`, "REQUEST_ROOM_STATE");
  }

  function syncChatSubscriptions(current: StompClientLike) {
    chatSubscription?.unsubscribe();
    chatSubscription = null;
    teamSubscription?.unsubscribe();
    teamSubscription = null;
    if (!membership.isPlayer) return;
    chatSubscription = current.subscribe(`/topic/room.${roomId}.chat`, (message) => {
      handlers.onChat(JSON.parse(message.body) as ChatMessageEnvelope);
    });
    if (membership.teamId) {
      teamSubscription = current.subscribe(
        `/topic/room.${roomId}.team.${membership.teamId}`,
        (message) => {
          handlers.onChat(JSON.parse(message.body) as ChatMessageEnvelope);
        },
      );
    }
  }

  function handleRoomTopicMessage(raw: string) {
    const event = JSON.parse(raw) as RoomEventEnvelope;
    if (localVersion === null) return; // no snapshot yet — Snapshot Delivery step 4 precedes this
    // A resync already in flight means localVersion is known-stale — every delta before the next
    // snapshot is discarded rather than reconciled against it, not just the one that triggered it.
    if (awaitingSnapshot) return;
    const outcome = reconcileVersion(localVersion, event.version);
    if (outcome === "discard") return;
    if (outcome === "resync") {
      awaitingSnapshot = true;
      requestRoomState();
      return;
    }
    localVersion = event.version;
    handlers.onEvent(event);
  }

  function handleSnapshot(raw: string) {
    const envelope = JSON.parse(raw) as RoomStateEnvelope;
    localVersion = envelope.version; // V2 — assign, never max()
    awaitingSnapshot = false;
    handlers.onSnapshot(envelope.payload, envelope.version);
  }

  /** Something the join needs has not arrived: no room snapshot yet, or no game message yet. */
  function attachIncomplete(): boolean {
    return localVersion === null || (game !== null && !gameDelivered);
  }

  function clearRecovery() {
    if (recoveryTimer !== null) environment.clearTimer(recoveryTimer);
    recoveryTimer = null;
    if (watchdogTimer !== null) environment.clearTimer(watchdogTimer);
    watchdogTimer = null;
  }

  function armWatchdog() {
    if (watchdogTimer !== null) environment.clearTimer(watchdogTimer);
    watchdogTimer = environment.setTimer(() => {
      watchdogTimer = null;
      if (stopped || !attachIncomplete()) return;
      recoverFromRateLimit({
        code: "RATE_LIMIT_EXCEEDED",
        message: "The room or game did not arrive.",
      });
    }, ATTACH_WATCHDOG_MS);
  }

  /**
   * A `SUBSCRIBE` or `REQUEST_GAME_SYNC` dropped by Tier 6 leaves the join half-complete with no
   * signal but `RATE_LIMIT_EXCEEDED` (which names no frame), so the whole attach is re-run once the
   * bucket has had time to refill.
   */
  function rerunAttach() {
    recoveryTimer = null;
    if (stopped || !client?.connected) return; // a reconnect re-runs the attach anyway
    // Only what is still missing: every frame re-sent against a bucket that is still refilling
    // is one more drop (`snapshot` refills 1 per 3 s, `subscribe` 1 per s).
    if (localVersion === null) {
      subscribeRoom(client);
      requestRoomState();
    }
    if (game !== null && !gameDelivered) syncGameSubscriptions(client);
    armWatchdog();
  }

  function recoverFromRateLimit(payload: RoomErrorEnvelope["payload"]) {
    if (recoveryTimer !== null) return; // one pending retry covers every drop in the burst
    if (rateLimitRetries >= MAX_RATE_LIMIT_RETRIES) {
      handlers.onGameStalled?.(true);
      handlers.onError(payload);
      return;
    }
    const delay = Math.max(
      payload.retryAfterMs ?? 0,
      SNAPSHOT_REFILL_MS,
      backoffDelay(rateLimitRetries, environment.random()),
    );
    rateLimitRetries += 1;
    recoveryTimer = environment.setTimer(rerunAttach, delay);
  }

  function handleError(raw: string) {
    const envelope = JSON.parse(raw) as RoomErrorEnvelope;
    if (envelope.payload.code === "RATE_LIMIT_EXCEEDED" && attachIncomplete()) {
      recoverFromRateLimit(envelope.payload);
      return;
    }
    handlers.onError(envelope.payload);
  }

  function subscribeAll(current: StompClientLike) {
    subscribeRoom(current);
    syncGameSubscriptions(current);
    armWatchdog();
  }

  function subscribeRoom(current: StompClientLike) {
    baseSubscriptions.forEach((subscription) => {
      subscription.unsubscribe();
    });
    baseSubscriptions = [
      current.subscribe(`/topic/room.${roomId}`, (message) => {
        handleRoomTopicMessage(message.body);
      }),
      current.subscribe("/user/queue/room-state", (message) => {
        handleSnapshot(message.body);
      }),
      current.subscribe("/user/queue/errors", (message) => {
        handleError(message.body);
      }),
    ];
    syncChatSubscriptions(current);
  }

  function connect() {
    timer = null;
    // Exactly one connection: a stale client is torn down before a new one exists.
    client?.deactivate();
    const current = environment.createClient(brokerUrl(instanceHint));
    client = current;

    current.onConnect = () => {
      attempt = 0;
      handlers.onConnectionChange?.(true);
      // Resubscribe-not-assume: a reconnect does not carry the old subscriptions forward.
      baseSubscriptions = [];
      clearRecovery();
      rateLimitRetries = 0;
      handlers.onGameStalled?.(false);
      subscribeAll(current);
      requestRoomState();
    };

    current.onWebSocketClose = () => {
      handlers.onConnectionChange?.(false);
      chatSubscription = null;
      teamSubscription = null;
      gameSubscriptions = [];
      clearRecovery(); // the reconnect re-runs the whole attach
      if (stopped) return;
      localVersion = null; // the next snapshot is the source of truth, not this stale value
      awaitingSnapshot = false;
      timer = environment.setTimer(connect, backoffDelay(attempt, environment.random()));
      attempt += 1;
    };

    current.activate();
  }

  connect();

  return {
    attachGame: (sessionId, teamId, listener) => {
      game = { sessionId, teamId, listener };
      if (client?.connected) syncGameSubscriptions(client);
      const attached = game;
      return () => {
        if (game !== attached) return;
        game = null;
        handlers.onGameStalled?.(false);
        gameSubscriptions.forEach((subscription) => {
          subscription.unsubscribe();
        });
        gameSubscriptions = [];
      };
    },
    submitGameAction: (payload) => {
      if (game) send(`/app/game.${game.sessionId}.action`, "SUBMIT_ACTION", payload);
    },
    requestRoomState,
    retryAttach: () => {
      clearRecovery();
      rateLimitRetries = 0;
      handlers.onGameStalled?.(false);
      rerunAttach();
    },
    sendMemberCommand: (type, payload) => {
      send(`/app/room.${roomId}.member`, type, payload);
    },
    sendHostCommand: (type, payload) => {
      send(`/app/room.${roomId}.host`, type, payload);
    },
    sendChatMessage: (channel, text) => {
      send(`/app/room.${roomId}.chat`, "SEND_CHAT_MESSAGE", { channel, text });
    },
    setMembership: (next) => {
      // Callers report membership on every snapshot and event. Resubscribing each time burns the
      // server's `subscribe` bucket (20, refilled 1/s — `rate-limiting.md` Tier 6) and drops the
      // game subscriptions that follow; only a real change in role or team needs new ones.
      const changed = next.isPlayer !== membership.isPlayer || next.teamId !== membership.teamId;
      membership = next;
      if (changed && client?.connected) syncChatSubscriptions(client);
    },
    close: () => {
      stopped = true;
      clearRecovery();
      if (timer !== null) environment.clearTimer(timer);
      client?.deactivate();
      client = null;
    },
  };
}
