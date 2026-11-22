# Agent guide

## Project

Catan Online is a multiplayer browser game built with TypeScript, React, Vite,
Express and Socket.IO. Node.js 20+ is required. See `README.md` for gameplay and
setup; `PROGRESS.md` is a historical snapshot and may be outdated.

## Commands

- `npm install` — install dependencies.
- `npm run dev` — start the server on port 3001 and Vite on port 5173.
- `npm test` — run the Vitest suite once.
- `npm test -- shared/__tests__/rules.test.ts` — run a specific test file;
  substitute the relevant path.
- `npm run build` — type-check and build the client.
- `npm run simulate -- <seed> <players>` — run a reproducible bot game and
  check card conservation.
- `npm start` — serve the built client and sockets in production mode.

The `justfile` provides shortcuts for these commands; run `just` to list them.
`just deploy` builds and starts the production server locally, not remotely.

Use focused tests for the changed behavior and run the build for TypeScript or
client changes. There is no separate lint script in `package.json`.

## Where things live

- `shared/types.ts` defines game state and actions; `shared/rules.ts` owns
  `applyAction`, `legalMoves`, scoring and rule validation.
- `shared/layout.ts` derives the board graph; `scenario.ts`, `setup.ts` and
  `rng.ts` define maps and deterministic generation.
- `shared/redact.ts` builds each player's private view and legal moves.
- `server/rooms.ts` manages seats, rooms, actions and persistence;
  `server/index.ts` handles HTTP and Socket.IO.
- `src/net/useGame.ts` manages the client connection and reconnect tokens;
  `src/ui/` and `src/App.tsx` implement the interface.
- `src/board/` renders the SVG board; `src/board3d/` renders the lazy-loaded
  3D board and falls back to 2D. `src/fx/` derives effects from view changes.
- Tests live in `shared/__tests__/`, `server/__tests__/`, and `src/__tests__/`.

## Invariants for changes

- The server is authoritative: validate actions in the shared rules engine,
  not just in the UI. Keep `legalMoves` and action validation consistent, and
  have the client use the server-provided moves rather than duplicating rules.
- Never broadcast full game state, another player's hidden cards, deck order,
  RNG state, or reconnect tokens. Update redaction and multiplayer tests when
  adding state or changing socket payloads.
- Keep shared game logic independent of DOM and Node APIs. Preserve seeded,
  reproducible game transitions and the canonical board graph; test rule
  changes with deterministic states and relevant edge cases.
- Preserve the per-tab `sessionStorage` reconnect session and the
  `localStorage` saved-seat behavior when changing connection flows. Room data
  is persisted to `data/rooms.json` or `CATAN_DATA`; do not commit runtime data
  or tokens.
- Keep 2D and 3D boards consistent with the same view and legal moves, including
  the 2D fallback and reduced-motion behavior. For visual or interaction
  changes, check both modes where applicable.
- Follow existing strict TypeScript and nearby formatting conventions. Add
  focused tests for changed behavior and keep changes scoped to the task.
