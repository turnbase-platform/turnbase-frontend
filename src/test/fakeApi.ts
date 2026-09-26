import { vi } from "vitest";

export interface FakeReply {
  status?: number;
  body?: unknown;
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
        headers: { "Content-Type": "application/json" },
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
