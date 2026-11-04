# turnbase-frontend — code map

The platform SPA (React 19, TypeScript, Vite). Feature folders under `src/features/`, shared
plumbing under `src/shared/`, the design system wrapper under `src/ui/`. Specified in
`docs/specs/platform-frontend/`; checked by `python3 scripts/check-corpus.py code-maps` from the
umbrella repository.

## Directories

| Path | Responsibility |
|---|---|
| `src/app/` | Shell, routing (`routes.tsx`, `RouteGuard.tsx`), nav bar, appearance |
| `src/features/auth/` | Login, registration, OAuth completion, guest sign-in, auth context |
| `src/features/catalog/` | Game catalogue and game detail pages |
| `src/features/rooms/` | Room list, lobby, room session, chat, STOMP connection and reducer |
| `src/features/game/` | Sandboxed game iframe and the postMessage relay |
| `src/features/friends/` | Friends and requests |
| `src/features/profile/` | Public profile, relationship actions, statistics |
| `src/features/history/` | Game history list |
| `src/features/notifications/` | Bell, panel, SSE stream |
| `src/features/settings/` | Account, privacy, auth methods, appearance |
| `src/features/onboarding/` | Quick tour |
| `src/shared/` | `api.ts` fetch client, redirects, formatting, immersive mode |
| `src/ui/` | Astryx-based components in the TurnBase look |
| `src/theme/` | The committed TurnBase theme |

## Flows

### Sign-in

1. `GuestButton` or `useLoginForm` / `useRegisterForm` call the API through `apiFetch` (`api.ts`).
2. `AuthProvider` holds the principal; `RouteGuard` gates routes by the `access` field in `routes.tsx`.
3. `onUnauthorized` (`api.ts`) signs the user out on a 401.

### Room create and join

1. `CreateRoomButton` → `createRoom` (`roomsApi.ts`); `useJoinByCode` / `joinRoom` for invite codes.
2. `RoomPage` mounts `useRoomSession`, which opens the STOMP connection with `useRoomConnection` and `openRoomConnection` (`roomSocket.ts`).
3. `roomReducer.ts` applies snapshots and deltas (`reconcileVersion` decides apply, discard or resync).
4. `LobbyControls` and `HostControls` send ready and start commands; `GameStartProgress` renders the start status (`startStatus.ts`).

### A move

1. `RoomGame` mounts `GameFrame` (sandboxed iframe, origin checked by `gameOrigin.ts`).
2. `GameRelay` (`gameRelay.ts`) forwards the game's postMessage actions to the game STOMP stream and delivers effects back (`gameMessages.ts`).

### Game upload

Not involved: uploads are made by developers with the SDK or API, not through the platform UI. The catalogue shows the result (`useCatalog`).

### Game Host failure

`useRoomConnection` reports a closed room as a `RoomEnd`; `roomSocket.ts` retries with `backoffDelay` and the `ATTACH_WATCHDOG_MS` watchdog, then resyncs; `GameStartProgress` shows a failed start.
