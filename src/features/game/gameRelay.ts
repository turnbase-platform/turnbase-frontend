import type { GameInbound, GamePlayerRef } from "./gameMessages";

/** `websocket.md` § *Platform-shell relay contract* — the translating half of the shell. */
export interface GameRelayHandlers {
  /** Posts to the iframe; the caller addresses it to the trusted origin, never `'*'`. */
  post: (message: GameInbound) => void;
  /** `GAME_LOG` entries and the sync's log — rendered by the platform UI, never the iframe. */
  onLog: (entries: GameLogEntry[]) => void;
  /** `SESSION_FAILED` — rendered by the platform UI, never the iframe. */
  onSessionFailed: (payload: { reason: string; message: string }) => void;
}

export interface GameLogEntry {
  sequence: number;
  index: number;
  entry: string;
}

interface Sequenced {
  type: string;
  sequence: number;
  index: number;
  payload: unknown;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function asSequenced(record: Record<string, unknown>): Sequenced | null {
  if (
    typeof record.type !== "string" ||
    typeof record.sequence !== "number" ||
    typeof record.index !== "number"
  ) {
    return null;
  }
  return {
    type: record.type,
    sequence: record.sequence,
    index: record.index,
    payload: record.payload,
  };
}

const bySequence = (a: Sequenced, b: Sequenced) => a.sequence - b.sequence || a.index - b.index;

/**
 * Translates STOMP game messages into iframe messages and enforces the two ordering gates
 * (`websocket.md` § *Platform-shell relay contract*):
 *
 * 1. `init` is not posted until both `GAME_SYNC` and the iframe's `ready` have arrived;
 * 2. every game message is held until `init` is out, then flushed in `(sequence, index)` order.
 *
 * Dedup is by `(sequence, index)` against `lastApplied`, seeded `(asOfSequence, +∞)` by the sync.
 * There is deliberately **no gap detection** — the game stream is sparse by design.
 */
export class GameRelay {
  private ready = false;
  private initPosted = false;
  private sync: { init: unknown; view: unknown; log: GameLogEntry[]; asOf: number } | null = null;
  private buffer: Sequenced[] = [];
  private lastApplied: { sequence: number; index: number } | null = null;

  constructor(
    private readonly sessionId: string,
    private readonly handlers: GameRelayHandlers,
  ) {}

  /** The iframe's `ready` handshake. */
  markReady(): void {
    this.ready = true;
    this.tryPostInit();
  }

  /** Accepts one raw STOMP body; unrecognised or foreign-session messages are dropped. */
  receive(raw: unknown): void {
    if (!isRecord(raw) || raw.sessionId !== this.sessionId) return;
    if (raw.type === "SESSION_FAILED") {
      const payload = raw.payload;
      if (isRecord(payload) && typeof payload.reason === "string") {
        this.handlers.onSessionFailed({
          reason: payload.reason,
          message: typeof payload.message === "string" ? payload.message : "",
        });
      }
      return;
    }
    if (raw.type === "GAME_SYNC") {
      this.receiveSync(raw);
      return;
    }
    const message = asSequenced(raw);
    if (!message) return;
    if (!this.initPosted) {
      this.buffer.push(message);
      return;
    }
    this.apply(message);
  }

  private receiveSync(raw: Record<string, unknown>): void {
    const payload = raw.payload;
    if (!isRecord(payload) || typeof raw.asOfSequence !== "number") return;
    const log = Array.isArray(payload.log) ? (payload.log as GameLogEntry[]) : [];
    this.sync = { init: payload.init, view: payload.view, log, asOf: raw.asOfSequence };
    this.lastApplied = { sequence: raw.asOfSequence, index: Number.POSITIVE_INFINITY };
    this.handlers.onLog(log);
    if (this.initPosted) {
      // A re-sync after a socket reconnect: the iframe already has its `init`, and the view is a
      // complete picture, so it goes in as a `game_event` and whatever was buffered above
      // `asOfSequence` is applied on top.
      this.handlers.post({ type: "game_event", payload: payload.view });
      this.flush();
      return;
    }
    this.tryPostInit();
  }

  private tryPostInit(): void {
    if (this.initPosted || !this.ready || !this.sync) return;
    const init = isRecord(this.sync.init) ? this.sync.init : {};
    this.handlers.post({ ...init, type: "init" });
    this.handlers.post({ type: "game_event", payload: this.sync.view });
    this.initPosted = true;
    this.flush();
  }

  private flush(): void {
    const pending = this.buffer.sort(bySequence);
    this.buffer = [];
    pending.forEach((message) => {
      this.apply(message);
    });
  }

  private apply(message: Sequenced): void {
    const last = this.lastApplied;
    if (
      last &&
      (message.sequence < last.sequence ||
        (message.sequence === last.sequence && message.index <= last.index))
    ) {
      return; // already in the snapshot, or a duplicate delivery
    }
    this.lastApplied = { sequence: message.sequence, index: message.index };
    const payload = message.payload;
    switch (message.type) {
      case "GAME_EVENT":
        this.handlers.post({ type: "game_event", payload });
        return;
      case "GAME_LOG":
        if (isRecord(payload) && typeof payload.entry === "string") {
          this.handlers.onLog([
            { sequence: message.sequence, index: message.index, entry: payload.entry },
          ]);
        }
        return;
      case "GAME_PLAYER_JOINED":
      case "GAME_PLAYER_LEFT":
        if (isRecord(payload) && isRecord(payload.player)) {
          this.handlers.post({
            type: message.type === "GAME_PLAYER_JOINED" ? "player_joined" : "player_left",
            player: payload.player as unknown as GamePlayerRef, // `reason` is dropped
          });
        }
        return;
      case "GAME_OVER":
        this.handlers.post({
          type: "game_over",
          results: isRecord(payload) ? payload.results : undefined,
        });
        return;
      default:
        return;
    }
  }
}
