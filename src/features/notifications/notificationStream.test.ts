import { describe, expect, it, vi } from "vitest";
import { FakeEventSource } from "../../test/fakeApi";
import {
  STREAM_URL,
  backoffDelay,
  openNotificationStream,
  type StreamEnvironment,
} from "./notificationStream";

function harness() {
  FakeEventSource.reset();
  const timers: { callback: () => void; delayMs: number; cleared: boolean }[] = [];
  const environment: StreamEnvironment = {
    createSource: (url) => new FakeEventSource(url),
    setTimer: (callback, delayMs) => {
      const timer = { callback, delayMs, cleared: false };
      timers.push(timer);
      return timer;
    },
    clearTimer: (handle) => {
      (handle as { cleared: boolean }).cleared = true;
    },
    random: () => 1,
  };
  const handlers = { onNotification: vi.fn(), onAlert: vi.fn() };
  const close = openNotificationStream(handlers, environment);
  const latest = () => FakeEventSource.instances[FakeEventSource.instances.length - 1];
  return { handlers, timers, close, latest };
}

const note = (id: string) => ({ type: "FRIEND_REQUEST", notificationId: id });

describe("openNotificationStream", () => {
  it("opens exactly one connection to the stream endpoint", () => {
    const { latest } = harness();
    expect(FakeEventSource.instances).toHaveLength(1);
    expect(latest().url).toBe(STREAM_URL);
  });

  it("routes the two event classes to their own handlers", () => {
    const { handlers, latest } = harness();
    latest().emit("notification", note("n-1"));
    latest().emit("alert", { type: "INVITATION_ACCEPTED", user: "bob" });

    expect(handlers.onNotification).toHaveBeenCalledWith(note("n-1"));
    expect(handlers.onAlert).toHaveBeenCalledWith({ type: "INVITATION_ACCEPTED", user: "bob" });
  });

  it("delivers a notification once even if it arrives again (at-least-once delivery)", () => {
    const { handlers, latest } = harness();
    latest().emit("notification", note("n-1"));
    latest().emit("notification", note("n-1"));
    latest().emit("notification", note("n-2"));
    expect(handlers.onNotification).toHaveBeenCalledTimes(2);
  });

  it("keeps deduplicating across a reconnect, when the server replays", () => {
    const { handlers, timers, latest } = harness();
    latest().emit("notification", note("n-1"));
    latest().fail(2);
    timers[0]?.callback();
    latest().emit("notification", note("n-1"));
    expect(handlers.onNotification).toHaveBeenCalledOnce();
  });

  it("ignores a malformed event instead of throwing", () => {
    const { handlers, latest } = harness();
    latest().emitRaw("alert", "{nope");
    latest().emitRaw("notification", "not json");
    expect(handlers.onAlert).not.toHaveBeenCalled();
    expect(handlers.onNotification).not.toHaveBeenCalled();
  });

  describe("reconnection", () => {
    it("leaves a transient error to the browser's own reconnect", () => {
      const { timers, latest } = harness();
      latest().fail(0); // CONNECTING — the browser is already retrying
      expect(timers).toHaveLength(0);
      expect(FakeEventSource.instances).toHaveLength(1);
      expect(latest().closed).toBe(false);
    });

    it("reopens with backoff when the browser has given up, on a single connection", () => {
      const { timers, latest } = harness();
      const first = latest();
      first.fail(2);
      expect(first.closed).toBe(true);
      expect(timers).toHaveLength(1);

      timers[0]?.callback();
      expect(FakeEventSource.instances).toHaveLength(2);
      expect(latest()).not.toBe(first);
    });

    it("grows the delay on consecutive failures and resets once a connection opens", () => {
      const { timers, latest } = harness();
      latest().fail(2);
      timers[0]?.callback();
      latest().fail(2);
      timers[1]?.callback();
      latest().fail(2);
      const delays = timers.map((timer) => timer.delayMs);
      expect(delays[1]).toBeGreaterThan(delays[0] ?? 0);
      expect(delays[2]).toBeGreaterThan(delays[1] ?? 0);

      timers[2]?.callback();
      latest().onopen?.(new Event("open"));
      latest().fail(2);
      expect(timers[3]?.delayMs).toBe(delays[0]);
    });

    it("stops retrying after close, and cancels a pending retry", () => {
      const { timers, close, latest } = harness();
      latest().fail(2);
      close();
      expect(timers[0]?.cleared).toBe(true);

      const before = FakeEventSource.instances.length;
      latest().fail(2);
      expect(FakeEventSource.instances).toHaveLength(before);
    });

    it("closes the live connection on close", () => {
      const { close, latest } = harness();
      close();
      expect(latest().closed).toBe(true);
    });
  });
});

describe("backoffDelay", () => {
  it("doubles per attempt within full jitter, capped at 30 s", () => {
    expect(backoffDelay(0, 1)).toBe(1_000);
    expect(backoffDelay(0, 0)).toBe(500);
    expect(backoffDelay(1, 1)).toBe(2_000);
    expect(backoffDelay(3, 1)).toBe(8_000);
    expect(backoffDelay(20, 1)).toBe(30_000);
    expect(backoffDelay(20, 0)).toBe(15_000);
  });
});
