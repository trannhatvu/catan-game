# Project Improvement Plan

**Status:** In progress — delivery 1 complete
**Prepared:** 2026-11-22

This plan prioritizes improvements to the current Catan Online implementation.
It covers reconnect ownership, persistence, production readiness, accessibility
and mobile usability, and documentation. The separate CI and end-to-end
automation initiative is intentionally excluded.

## Recommended order

1. Fix reconnect ownership (complete).
2. Harden persistence.
3. Prepare for public hosting.
4. Improve accessibility and mobile usability.
5. Refresh documentation.

Complete and validate each delivery before moving to the next. Hosting-provider
configuration should wait until a provider is selected.

## 1. Fix reconnect ownership

**Goal:** Exactly one active socket controls a seat.

**Relevant files:** `server/index.ts`, `server/rooms.ts`,
`src/net/useGame.ts`.

**Status:** Implemented on 2026-11-22.

The server now verifies that a socket still owns its seat before accepting
actions or room controls. Rejoining a connected seat invalidates and disconnects
the previous socket; that client clears its tab session instead of attempting
to reclaim the seat. Moving to another room releases the old seat, and leave
handling disconnects that exact seat rather than another seat sharing a
transitional socket ID.

Regression coverage includes active-seat replacement and room switching, while
existing refresh, room lifecycle and host-handover tests remain passing.
Validation: 21 focused room/multiplayer tests passed, and `npm run build`
passed. The build still reports its large 3D bundle warning.

### Implementation

1. Define the invariant: a socket may act only if its ID matches the seat's
   current `socketId` and the seat still belongs to the room.
2. On successful rejoin:
   - Identify and invalidate the previous socket's association.
   - Transfer ownership to the new socket.
   - Notify the old client that its seat was taken over.
   - Ensure the old client does not automatically reclaim the seat and cause a
     reconnect loop.
3. Apply the ownership check consistently to actions, starting games, map
   changes and leaving.
4. Prevent a stale socket's leave or disconnect event from disconnecting the
   replacement socket.
5. Define behavior when one socket requests another room: cleanly leave its
   previous association before assigning the new one.
6. Preserve current refresh, lobby leave and saved-seat behavior.

### Acceptance checks

- Rejoin while the original socket is still connected: only the new socket can
  act.
- Disconnect or leave from the old socket: the new connection remains active.
- An invalid token does not change seat ownership.
- Normal refresh, lobby leave, game resume and host handover still work.

## 2. Harden persistence

**Goal:** Restart without silently losing games, and make storage failures
visible.

**Relevant file:** `server/rooms.ts`.

### Implementation

1. **Make loading explicit**
   - Treat a missing file as a normal first start.
   - Treat invalid JSON, invalid data and permission errors as startup failures
     with actionable logs.
   - Validate loaded room data before adding it to the live store; do not
     partially load a damaged file.
   - Keep existing save files readable, or provide an explicit migration.
2. **Make writes reliable**
   - Retain the temporary-file-and-rename approach, but surface write and
     rename failures.
   - Define what users see when a save fails; do not acknowledge an update as
     safely persisted if it was not.
   - Ensure a failed write cannot overwrite the last valid save.
   - Avoid logging room tokens or full private game state.
3. **Address scale deliberately**
   - First measure the cost of rewriting all rooms synchronously.
   - Keep the current single-file store for a small single-server deployment if
     adequate.
   - Consider a database only if room volume, multi-process deployment or
     recovery requirements justify it; define migration and backup procedures
     before switching.
4. **Document recovery**
   - Explain `CATAN_DATA`, filesystem permissions, backup location and
     restoration.
   - Document that the save contains private game data and reconnect secrets.

### Acceptance checks

- A saved game resumes after restart with state and seats intact.
- A missing file starts cleanly; a corrupt or unreadable file produces a clear
  failure.
- A simulated write failure leaves the previous save intact and reports the
  failure.
- Existing saves remain usable or migrate without losing active games.

## 3. Prepare for public hosting

**Goal:** Make a single-server deployment reproducible and safer. Choose a
hosting provider before implementing provider-specific configuration.

**Relevant files:** `server/index.ts`, `server/rooms.ts`, `package.json`.

### 3.1 Credentials and request boundaries

1. Generate new reconnect tokens using Node's cryptographic random APIs.
2. Preserve existing tokens for active saved games unless an explicit migration
   or forced logout is chosen.
3. Validate incoming Socket.IO payloads at runtime, including room operations
   and every action shape; TypeScript types alone do not validate network input.
4. Return clear errors for malformed requests without exposing internal
   details.
5. Add reasonable request and connection limits, especially for room creation
   and rejoin attempts.
6. Configure allowed origins for the intended deployment. Origin restrictions
   are a supporting control, not a substitute for token checks.
7. Review game randomness separately if protection against adversarial
   prediction is required: hiding a deterministic seed alone is not a
   cryptographic guarantee.

### 3.2 Production runtime

1. Make production startup work after installing production dependencies only:
   either compile the server for Node or explicitly include its runtime tools as
   production dependencies.
2. Ensure the built client and Socket.IO work behind the chosen host's
   HTTPS/WebSocket proxy.
3. Configure `PORT` and a persistent `CATAN_DATA` location.
4. Make startup and storage failures visible in process logs; avoid printing
   secrets.
5. Add a minimal health/readiness endpoint appropriate to the host.
6. Define backups, restore steps, log retention and a restart procedure.

### 3.3 Deployment decisions

- **Hosting platform:** Select one that supports Node, WebSockets and persistent
  storage.
- **Deployment topology:** Initially use one server instance; the in-memory
  room map is not shared across instances.
- **Storage:** Use a persistent volume for the current file store, or plan a
  separate database migration.
- Keep `just deploy` documented as **local** production startup unless its
  behavior is intentionally changed.

### Acceptance checks

- A production-only installation starts successfully.
- Two clients can join and play through the hosted HTTPS endpoint.
- Restarting the process preserves a game on persistent storage.
- Invalid payloads and unauthorized or stale sockets cannot change game state.
- Backup restoration is practiced successfully without exposing secrets.

## 4. Improve accessibility and mobile usability

**Goal:** Make essential game actions usable without a mouse and on small
screens.

**Relevant files:** `src/board/Board.tsx`, `src/board3d/Board3D.tsx`,
`src/ui/Modals.tsx`, `src/styles.css`.

### Implementation

1. Provide keyboard-operable controls for every legal board placement,
   including settlements, roads, cities and robber moves.
2. Use the same server-provided legal moves and existing action callbacks for
   mouse, touch and keyboard.
3. For 3D, provide an accessible DOM-based selection alternative; canvas
   objects alone are not sufficient for screen readers.
4. Give choices meaningful labels describing their location and nearby terrain
   or numbers, rather than only internal IDs.
5. Add visible focus indicators and predictable focus order.
6. Review dialogs for accessible names, initial focus, focus containment and
   focus restoration; preserve mandatory game prompts.
7. Announce important turn, error and game-state changes without excessive
   announcements.
8. Check responsive layouts, touch target sizes, scrolling, dialogs and both
   board modes on phone-sized screens.
9. Preserve reduced-motion and 2D fallback behavior.

### Acceptance checks

- Complete setup and a representative turn using only the keyboard.
- A screen reader can identify and select legal placements and understand whose
  turn it is.
- No essential controls are clipped or unreachable at phone widths.
- Both 2D and 3D remain usable; reduced-motion settings remain respected.

## 5. Refresh documentation

**Goal:** Make current behavior and operational requirements easy to find.

**Relevant files:** `README.md`, `PROGRESS.md`, `AGENTS.md`.

### Implementation

1. Update setup, production startup, persistence, backup and recovery
   instructions after the behavior changes.
2. Clearly distinguish local `just deploy` from remote deployment.
3. Correct stale statements in the progress document, including room expiry and
   restart behavior; retain dated historical results as historical.
4. Document limits: 2–4 players, no in-game bots, and the large map's actual
   player limit.
5. Update agent guidance for new ownership, persistence and deployment
   invariants.
6. Avoid fixed test counts or "verified" claims unless accompanied by a date
   and actual results.

### Acceptance checks

- A new contributor can install, run and recover the application using the
  documented steps.
- Current documentation agrees with implemented behavior.
- Historical test results are not presented as current results.

## Delivery sequence

| Delivery | Outcome | Status |
| --- | --- | --- |
| 1 | Exclusive socket ownership and reconnect fixes | Complete |
| 2 | Safe loading, save failures and recovery | Pending |
| 3 | Token, payload and production-runtime hardening | Pending |
| 4 | Hosting configuration after selecting a provider | Pending |
| 5 | Keyboard, screen-reader and mobile improvements | Pending |
| 6 | Final documentation update | Pending |

Each delivery should include focused regression checks for the behavior changed.
CI and a new end-to-end automation initiative are outside this plan.
