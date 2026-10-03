# turnbase-frontend — CLAUDE.md

The platform frontend. React 19 + TypeScript, built with Vite, served as a static bundle.

**This file is additive** — corpus, registry and conventions live in the parent repository:

| | |
|---|---|
| Registry | `../docs/implementation/registry.md` — `IMP-M0-05`, `IMP-M6-01…06` |
| Conventions | `../docs/implementation/conventions.md` — **normative**, §1 *Frontend* and §6 |
| Design system | `../docs/decisions/0013-astryx-design-system.md` — **read before writing any view** |
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
upstream accessibility fixes and cannot be codemodded on upgrade. `src/ui/` holds only what Astryx
does not ship and is expected to stay near-empty. Application code imports
`@astryxdesign/core/<Component>` **directly**; there is no wrapper layer.

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
- **The three CSS imports are cascade-layer ordered:** `reset.css` → `astryx.css` → `theme.css`, in
  `src/index.css`. Wrong order renders built-in defaults **with no error**.

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

There is no integration tier here, and CI runs no browser e2e (FR-CICD-005). The MVP browser
acceptance suite (`IMP-M7-13`) is Playwright under `e2e/`, run by hand against the compose stack:
`make up` in `turnbase-platform` (seeded, with the Tic-Tac-Toe bundle — `local-environment.md` §5),
then `npm run e2e`. It spends one guest and one registration per run against the Tier 5 limit
(5 and 3 per IP per hour), so `make reset-db` before repeating it.

## The iframe boundary

Game frontends are untrusted, sandboxed, and served from a **separate registrable domain**
(ADR-0007). Communication is `postMessage` only — never shared state, never a shared origin. Origin
is validated on every message received.

## If a specification is wrong

**Stop, and fix the document in the parent repository first.**
