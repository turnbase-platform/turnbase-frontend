# turnbase-frontend

> Part of [TurnBase](https://github.com/turnbase-platform/turnbase), a platform for turn-based multiplayer games — this is the platform's web app. Start at the [umbrella README](https://github.com/turnbase-platform/turnbase#readme).

React 19 + TypeScript single-page app on the [Astryx](https://github.com/facebook/astryx) design system with
TurnBase's own theme (Light/Dark/Auto). It talks to the platform over REST and STOMP/WebSocket, and to game
frontends only by `postMessage`, in sandboxed iframes. Ships as a Docker image (nginx serving static assets).

## Build

```bash
npm ci
npm run lint && npm run typecheck && npm run format:check
npm run build                  # theme build, tsc, vite build -> dist/
```

## Run and test

```bash
npm run dev                    # Vite dev server
npm test                       # Vitest with coverage
npm run e2e                    # Playwright (needs the local stack, see the umbrella README)
```

The full stack, with the backend, is started from the umbrella repository (`deploy/compose`).

## Layout

Feature folders under `src/features/`, shared plumbing in `src/shared/`, the design-system wrapper in
`src/ui/`, the committed theme in `src/theme/`. See [`ARCHITECTURE.md`](ARCHITECTURE.md).

## Third-party licences

What this repository distributes is audited for its dependencies' licences (allowed families:
`docs/implementation/conventions.md` §6 *Third-party licences*). `npm run licenses` writes `licenses.csv`
(git-ignored) from production dependencies and fails on any licence outside the allowed set. The checker is
pinned in the script (`license-checker-rseidelsohn@5.0.1`).

The image carries the fonts' SIL OFL 1.1 text under `/licenses/` (see the `Dockerfile`). `css-mediaquery` (BSD-3-Clause, reached through StyleX) is declared as `BSD` and is excluded from the checker by name.

## Licence

Apache-2.0, see [`LICENSE`](LICENSE). Fonts (Figtree, Pixelify Sans) are SIL OFL 1.1.
