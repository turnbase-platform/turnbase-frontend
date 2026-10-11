# turnbase-frontend — CLAUDE.md

The platform frontend. React 19 + TypeScript, built with Vite, served as a static bundle.

**This file is additive** — corpus, registry and conventions live in the parent repository:

| | |
|---|---|
| Registry | `../docs/implementation/registry.md` — `IMP-M0-05`, `IMP-M6-01…06`, and M12 (`IMP-M12-01…11`, closed): the TurnBase identity |
| Conventions | `../docs/implementation/conventions.md` — **normative**, §1 *Frontend* and §6 |
| Design system | `../docs/decisions/0013-astryx-design-system.md` and `0017-turnbase-visual-identity.md` (the look, amending 0013 §4) — **read both before writing any view** |
| Design | `../docs/specs/platform-frontend/shell-architecture.md`, `design-system.md` |

## Components come from Astryx, and are looked up, never recalled

The component library is [Astryx](https://github.com/facebook/astryx)
(`@astryxdesign/core`) — Meta's, MIT, 150+ components.

**Nothing in this project lists Astryx's components, deliberately.** A copied inventory is stale
within a release. Look one up:

```bash
npm run astryx -- component <Name>     # or the `astryx` MCP server
```

**Do not write a component from memory of another library's API.** If you are unsure whether Astryx
ships something, that is a tool call, not a guess.

### The ladder: compose → swizzle → write

Stop at the first rung that works. **A swizzle is a fork with a nice name** — it stops receiving
upstream accessibility fixes and cannot be codemodded on upgrade. `src/ui/` holds what the TurnBase
identity needs and Astryx does not ship (effects, `Starfield`, `Logo`, icons, `PillTabs`, `Pane`,
the list-query kit). Application code imports `@astryxdesign/core/<Component>` **directly**; there is
no wrapper layer.

### The look is ours: `src/theme/`

- The TurnBase theme is `src/theme/turnbase.theme.ts`, **built** by `astryx theme build` and the
  output committed. It is never injected at runtime — the shell CSP is `style-src 'self'`. A drift
  test fails when the committed output is stale; after editing the source, rebuild.
- Colours live in `src/theme/palette.ts` as `[light, dark]` pairs and reach the theme as
  `light-dark()`; `tokens.css` and `surfaces.css` hold only non-colour `--tb-*` tokens and glass.
  Own tokens add to Astryx's; they never redefine one.
- **A colour literal belongs in `palette.ts` only** (and in the generated build, which lint
  ignores). `no-raw-color-*` still fails everywhere else; `no-raw-spacing-css` has no exemption —
  round an off-grid length to the `--spacing-*` scale. A unit test holds every text/background
  pair to WCAG AA in both appearances.
- Pixelify Sans is for the logo, display headings, big numbers and short labels only. Never in forms,
  tables, chat or rules.
- No `backdrop-filter`. Fake glass only.

### Every view is a hook plus a presentational component

The hook (`use<View>.ts`) calls the API modules and returns plain data and callbacks; the component
renders them and imports no API module. `roomsApi`, `roomSocket`, `roomReducer`, `useRoomConnection`,
`gameRelay`, `shared/api`, `AuthProvider` and `notificationStream` are services — a restyle does not
change them. Lists follow `docs/specs/api-design/pagination-filtering-sorting.md` and filter and sort
on the server; never slice or sort a fetched page in the view.

### Exact pins, no `^`

Astryx is **Beta**. Every `@astryxdesign/*` and `@stylexjs/stylex` version is pinned exactly.
Upgrades run `astryx upgrade --apply` codemods; they do not drift.

### No StyleX build plugin

Astryx authors with StyleX but **ships pre-built CSS** — no Vite plugin, no PostCSS, no Babel config.
If you find yourself adding a StyleX build plugin, stop: that is `@astryxdesign/build`, for compiling
Astryx *from source*, which this project never does.

## Two traps that surface far from their cause

- **`<LinkProvider component={Link}>` must be mounted in the shell.** Without it every Astryx `Link`
  emits a plain `<a href>` and triggers a full page reload — dropping the STOMP connection, the room
  subscription and all in-memory session state. It presents as a navigation bug three milestones from
  where it was introduced.
- **The CSS imports are cascade-layer ordered:** `reset.css` → `astryx.css` → the base `theme.css`
  → the built TurnBase theme → `tokens.css`, in `src/index.css`. Wrong order renders built-in
  defaults **with no error**.

## Before you commit

```bash
npm run format && npm run lint
npm run typecheck        # tsc --noEmit
npm run test             # coverage ≥70%, unit only
npm run build            # production build must pass
```

The lint stack is pinned in `conventions.md` §2, not left to `npm create vite`: ESLint **flat
config**, `typescript-eslint` **strict** + stylistic (type-aware), `eslint-plugin-react-hooks`, and
`eslint-config-prettier` **last** so ESLint stops having opinions about formatting. `tsconfig` runs
`strict: true`.

`git config core.hooksPath .githooks` once, to get the `pre-push` fast-fail.

There is no integration tier here, and CI runs no browser e2e: the suite needs the full compose
stack (FR-CICD-005), which a GitHub-hosted runner of this repository does not have. The browser
acceptance suite (`IMP-M7-13`, extended by `IMP-M8-16`) is Playwright under `e2e/`, run by hand:
`make up` in `turnbase-platform` (seeded, with the Tic-Tac-Toe bundle — `local-environment.md` §5),
then **`make e2e`** here (it checks the stack answers, then runs `npm run e2e`). It covers every
view's spec (`IMP-M8-06…14`), a forfeit's history row and statistics, the 60 s grace period, the
Tier 6 flood and its lockout recovery, two simultaneous leaves, a 400 px pass over every route, a desktop pass (1280 and 1920 px: every
interactive element inside the viewport and its clipping ancestors) and an axe-core pass with zero
violations over every route, tier and room state, **in Light and in Dark** (`sweep.spec.ts`; the
sandboxed game frame is left out of axe), a reduced-motion check (`motion.spec.ts`: no `--px` and a
static sky under `prefers-reduced-motion`, the Reduce-motion setting, and Cursor effects off), and a
**tripwire**: `e2e/fixtures.ts` fails any spec whose pages logged a console error, an uncaught
error or a `5xx` — import `test` from `./fixtures`, never from `@playwright/test`, and call
`tripwire.allow(/…/)` for one a spec provokes on purpose.

**The compose stack serves a prebuilt image.** `docker compose build` does nothing for the frontend:
after a change run `docker build -t turnbase/frontend:dev .` here, then `docker compose -f
deploy/compose/docker-compose.yml up -d --force-recreate frontend` in `turnbase-platform`. Vite inlines
assets under 4 KB, which turned two font subsets into `data:` URIs that `font-src 'self'` blocks;
`vite.config.ts` keeps `.woff2` out of that, and the tripwire is what notices if it regresses.

**The allowance.** Registration is 3 and guest minting 5 per address per hour (Tier 5). A run spends
**one** registration (`settings.spec.ts`, which deletes it) and **one** guest: `playAsGuest` signs in
with a cached guest cookie (`.e2e-cache/`, git-ignored) and only mints when the cache is missing or
the platform no longer honours it. Everything else uses the seeded users, so a run can be repeated
(two in a row fit; a third inside the hour waits for the window). New specs must not mint. Tier 1 is
the other budget: every `4xx` on a login, register or password-change path counts toward **5 failures
per address per 24 h** (the counter never resets on success, and the 5th starts a doubling lockout).
A run spends two — the wrong password in `auth.spec.ts`, the wrong current password in
`settings.spec.ts` — so **two runs fit in 24 h and the third fails** on login (seen 2026-10-04); for
a third, flush the dev stack's Redis (`docker compose exec redis redis-cli flushall`). Stub a failure you only
need to *render* (as the taken-username `409` is).
A cold game host can wedge on its first Espresso context after a clean `make up` (every spec that
starts a game then sees an empty frame): restart `gamehost` and warm it with `game.spec.ts` before
a run. The flood spec locks `dave` out of `CONNECT` for 30 s, doubling per repeat offence within the hour,
and waits for it to lapse.
`awaitRefilledBudgets` waits 15 s before each game spec: the seeded users' Tier 6
`subscribe`/`snapshot` buckets must refill between games, and a game started on an empty bucket
needs the client's back-off retry (`IMP-M8-15`).

**`make reset-db` is not the way to start clean** — after it the Game Host timed out creating
sessions (`DEADLINE_EXCEEDED`, every game start "could not be started") while reporting healthy.
Use `docker compose down -v` then `make up` in `turnbase-platform`.

## The iframe boundary

Game frontends are untrusted, sandboxed, and served from a **separate registrable domain**
(ADR-0007). Communication is `postMessage` only — never shared state, never a shared origin. Origin
is validated on every message received.

## If a specification is wrong

**Stop, and fix the document in the parent repository first.**
