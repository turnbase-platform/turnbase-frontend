import { vi } from "vitest";

export interface FakeReply {
  status?: number;
  body?: unknown;
  headers?: Record<string, string>;
}

export interface FakeCall {
  method: string;
  path: string;
  body: unknown;
}

type Route = FakeReply | ((call: FakeCall) => FakeReply);

/**
 * Stands in for `fetch` in unit tests. Routes are keyed `"METHOD /path"`; anything unrouted
 * answers 404 so a forgotten endpoint fails loudly instead of hanging.
 */
export function installFakeApi(routes: Record<string, Route>) {
  const calls: FakeCall[] = [];
  const fetchStub = vi.fn((input: string, init?: RequestInit) => {
    const call: FakeCall = {
      method: init?.method ?? "GET",
      path: input,
      body: typeof init?.body === "string" ? (JSON.parse(init.body) as unknown) : undefined,
    };
    calls.push(call);
    const route = routes[`${call.method} ${call.path}`] as Route | undefined;
    const reply = typeof route === "function" ? route(call) : (route ?? { status: 404 });
    const status = reply.status ?? 200;
    return Promise.resolve(
      new Response(status === 204 || reply.body === undefined ? null : JSON.stringify(reply.body), {
        status,
        headers: { "Content-Type": "application/json", ...reply.headers },
      }),
    );
  });
  vi.stubGlobal("fetch", fetchStub);
  return { calls, routes };
}

export const REGISTERED = { userId: "u-1", username: "alice", kind: "REGISTERED" } as const;
export const GUEST = { userId: "u-2", username: "guest-7f3a", kind: "GUEST" } as const;
export const UNAUTHORIZED = { status: 401, body: { type: "unauthenticated", status: 401 } };

/** jsdom has no EventSource; this one lets a test push events and fail the connection. */
export class FakeEventSource {
  static instances: FakeEventSource[] = [];
  static reset() {
    FakeEventSource.instances = [];
  }

  readyState = 1;
  onopen: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  closed = false;
  private listeners = new Map<string, ((event: MessageEvent<string>) => void)[]>();

  constructor(readonly url: string) {
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: (event: MessageEvent<string>) => void) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  close() {
    this.closed = true;
    this.readyState = 2;
  }

  emit(type: string, data: unknown) {
    this.emitRaw(type, JSON.stringify(data));
  }

  emitRaw(type: string, data: string) {
    const event = new MessageEvent<string>(type, { data });
    this.listeners.get(type)?.forEach((listener) => {
      listener(event);
    });
  }

  fail(readyState: number) {
    this.readyState = readyState;
    this.onerror?.(new Event("error"));
  }
}

/** Stands in for `@stomp/stompjs`'s `Client` — no network, a test drives it directly. */
export class FakeStompClient {
  static instances: FakeStompClient[] = [];
  static reset() {
    FakeStompClient.instances = [];
  }

  connected = false;
  activated = false;
  onConnect: () => void = () => undefined;
  onWebSocketClose: (evt?: unknown) => void = () => undefined;
  published: { destination: string; body: string }[] = [];
  private subscriptions = new Map<string, ((message: { body: string }) => void)[]>();

  constructor(readonly brokerURL: string) {
    FakeStompClient.instances.push(this);
  }

  activate() {
    this.activated = true;
  }

  deactivate() {
    this.activated = false;
    this.connected = false;
  }

  publish(params: { destination: string; body: string }) {
    this.published.push(params);
  }

  subscribe(destination: string, callback: (message: { body: string }) => void) {
    this.subscriptions.set(destination, [...(this.subscriptions.get(destination) ?? []), callback]);
    return {
      unsubscribe: () => {
        this.subscriptions.set(
          destination,
          (this.subscriptions.get(destination) ?? []).filter((entry) => entry !== callback),
        );
      },
    };
  }

  /** Test hook: pretend the server delivered `body` on `destination`. */
  emit(destination: string, body: unknown) {
    const message = { body: JSON.stringify(body) };
    this.subscriptions.get(destination)?.forEach((listener) => {
      listener(message);
    });
  }

  /** Test hook: complete the handshake this client's owner started with `activate()`. */
  open() {
    this.connected = true;
    this.onConnect();
  }

  /** Test hook: the socket drops, connected or not. */
  close() {
    this.connected = false;
    this.onWebSocketClose();
  }

  isSubscribed(destination: string): boolean {
    return (this.subscriptions.get(destination) ?? []).length > 0;
  }
}
