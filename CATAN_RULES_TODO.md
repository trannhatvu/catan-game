# CATAN Rulebook Compliance Work Tracker

**Updated:** 2026-11-22
**Source:** [CATAN_RULES_SPEC.md](./CATAN_RULES_SPEC.md), based on the supplied
2025 base-game rulebook.

This list tracks implementation against the rulebook's 3–4 player base-game
scope. Two-player play and the large extension board are documented as
out-of-scope variants, not silently counted as base-game compliance.

## Delivery 1 — Enforce existing rules on the server (complete)

- [x] Require the active player to steal when eligible robber
  victims exist; add a regression test for a null target.
- [x] Reject player trade offers that give and request the same
  resource type; add a regression test for a net-gift offer.

Validation: `npm test -- shared/__tests__/rules.test.ts
shared/__tests__/setup.test.ts` passed (38 tests), and `npm run build` passed
on 2026-11-22. The build retains the existing large 3D-bundle warning.

## Delivery 2 — Setup and negotiation (complete)

- [x] Add validated player counteroffers, include them in the public trade
  state, expose them in the UI, and cover the flow with reducer and socket tests.
- [x] Roll for the first player before the draft; tied leaders reroll, and the
  winner starts both the snake draft and the first turn.
- [x] Relabel Beginner as **Fixed board** to describe its deterministic map and
  normal draft without claiming the rulebook's pre-arranged starting pieces.
- [x] Deal Classic number tokens counterclockwise in the rulebook's A–R order,
  skipping the desert; retain the legal randomizer for the large-map variant.

Validation: `npm test` passed (88 tests), `npm run build` passed, and
`npm run simulate -- 2024 3` reached a winner with no resource or development
deck conservation warnings. A two-client browser smoke test confirmed the
initiative roll handoff and fixed-board label.

## Completed

- [x] Create the rulebook-based specification and audit in
  [CATAN_RULES_SPEC.md](./CATAN_RULES_SPEC.md).
- [x] Document two-player and large-map support as outside the supplied base
  rulebook's scope.
