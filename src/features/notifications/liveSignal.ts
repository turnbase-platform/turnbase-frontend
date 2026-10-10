// The notification stream is opened once per tab by NotificationBell. Views that mirror
// server state the stream announces (the Friends view) subscribe here instead of opening a
// second EventSource — one connection per tab (shell-architecture.md §7), no polling.

type Listener = () => void;

const friendListeners = new Set<Listener>();

/** Calls `listener` on each pushed `FRIEND_*` notification and each stream (re)connect. */
export function subscribeFriendChanges(listener: Listener): () => void {
  friendListeners.add(listener);
  return () => {
    friendListeners.delete(listener);
  };
}

export function isFriendNotification(type: string): boolean {
  return type.startsWith("FRIEND_");
}

export function signalFriendChange(): void {
  friendListeners.forEach((listener) => {
    listener();
  });
}
