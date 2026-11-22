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

## Remaining rulebook work

- [ ] Add a player-to-player counteroffer flow, including reducer validation,
  redacted state, UI, and multiplayer tests.
- [ ] Determine the first player by the highest dice roll before the opening
  draft; handle tied rolls and cover the order with tests.
- [ ] Decide whether the Beginner option should pre-place the rulebook's
  starting pieces or be relabeled as a fixed board with the normal draft.
- [ ] Match the rulebook's letter-order procedure for variable number-token
  placement, or explicitly retain the current valid-board randomizer as an app
  variant.

## Completed

- [x] Create the rulebook-based specification and audit in
  [CATAN_RULES_SPEC.md](./CATAN_RULES_SPEC.md).
- [x] Document two-player and large-map support as outside the supplied base
  rulebook's scope.
