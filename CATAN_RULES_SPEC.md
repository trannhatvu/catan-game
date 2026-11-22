# CATAN Base Game Rules Specification and Implementation Audit

## Reference and scope

This is an original, paraphrased implementation checklist based on the
[CATAN – The Game Rulebook supplied for this review](https://www.catan.com/sites/default/files/2025-03/CN3081%20CATAN%E2%80%93The%20Game%20Rulebook%20secure%20%281%29.pdf)
(2025 edition, revision `v6.250401` in the PDF footer; reviewed 2026-11-22).
It covers the rulebook's 3–4 player base game, including its recommended fixed
setup and variable setup. It does not specify Seafarers, the 5–6 player
extension, or unofficial two-player rules.

The implementation review covered the shared rules, board generation and
scenarios, room player limits, redacted views, relevant UI, and shared rule
tests. After the first rule-fix delivery, focused validation on 2026-11-22
passed: `npm test -- shared/__tests__/rules.test.ts
shared/__tests__/setup.test.ts` (38 tests) and `npm run build`. Passing tests
is not proof of complete rulebook compliance.

## Verdict

The project implements most of the base game's core loop: setup drafting,
resource production, the robber, construction, bank and harbour trades,
development cards, awards, and victory scoring. It does **not** implement
every rule in the supplied book.

Two server-side gaps from the initial audit are now fixed: eligible robber theft
cannot be skipped, and same-resource player trades are rejected. The main
remaining conformance gaps are:

1. Players can accept or decline a trade, but cannot make counteroffers.
2. The room's first seat starts; the highest-dice first-player selection is
   absent.
3. The beginner board is fixed, but its prescribed opening pieces are not;
   the game always asks players to draft placements.

The project also supports two-player rooms, which are outside the supplied
rulebook's 3–4 player scope. The large map is based on a 5–6 player extension
board, but the project caps rooms at four and does not implement that
extension's full rules.

## Status key

- **Implemented** — inspected behavior matches the requirement.
- **Partial** — the core behavior exists, but a rule or setup detail differs.
- **Variant / out of scope** — an intentional project mode not specified by
  this rulebook.
- **Missing** — the required behavior is absent.

## Requirements and compliance

### Setup and components

| ID | Requirement | Status | Implementation notes |
| --- | --- | --- | --- |
| SET-01 | A standard game uses the base island: 19 land hexes, with the rulebook's terrain and number-token supplies; no hex has a 7 token. | Implemented | [BASE_GAME](./shared/scenario.ts#L47) defines the supplies. |
| SET-02 | The bank starts with 19 cards of each resource. The development deck has 25 cards: 14 Knights, 5 Victory Points, and 2 of each other action card. | Implemented | [game creation and deck](./shared/rules.ts#L28) initialize these supplies. |
| SET-03 | Each player has 15 roads, 5 settlements, and 4 cities. The base board has four 3:1 ports and one 2:1 port for each resource. | Implemented | [piece limits](./shared/types.ts#L45) and [port supply](./shared/scenario.ts#L44). |
| SET-04 | Variable setup creates a playable board, places the robber on the desert, and keeps 6/8 tokens apart. | Partial | [board generation](./shared/setup.ts#L17) satisfies these constraints, but places shuffled number values and retries rather than following the PDF's letter-order placement procedure. The resulting legal boards can therefore differ. |
| SET-05 | The recommended beginner setup uses its fixed board and prescribed starting-piece layout. | Partial | The [beginner scenario](./shared/scenario.ts#L66) fixes the board recipe, but the game still uses the normal free-placement draft; the printed starting-piece locations are not pre-placed. |
| SET-06 | Determine the first player by the highest dice roll. | Missing | New games set the current player to seat zero in [createGame](./shared/rules.ts#L291); there is no initiative roll. |
| SET-07 | In variable setup, players place a settlement and adjacent road in order, then place their second settlement and road in reverse order. The second settlement grants its adjacent resources. | Implemented | [Setup progression](./shared/rules.ts#L318), [setup actions](./shared/rules.ts#L470), and the [draft tests](./shared/__tests__/rules.test.ts#L80) cover the snake order and payout. |
| SET-08 | The base rulebook is for 3–4 players. | Variant / out of scope | Rooms allow 2–4 players in [room limits](./server/rooms.ts#L22). Two-player play is an app mode, not a rulebook-compliant base game. |
| SET-09 | The 5–6 player extension uses its additional rules as well as a larger board. | Variant / out of scope | [Large island](./shared/scenario.ts#L86) supplies the larger board, but the app allows at most four seats and has no extension turn rules. |

### Turn, production, and robber

| ID | Requirement | Status | Implementation notes |
| --- | --- | --- | --- |
| TURN-01 | Turns proceed in seat order. A turn has production followed by an action phase; the active player can take legal actions in the action phase before ending the turn. | Implemented | The [phase reducer](./shared/rules.ts#L449) owns turn actions and advances the current seat. |
| PROD-01 | Roll two six-sided dice. Matching unblocked terrain produces one resource per settlement and two per city. | Implemented | [Production](./shared/rules.ts#L390) skips the robber's hex and counts buildings. |
| PROD-02 | If the bank cannot cover a resource demand for multiple players, nobody receives that resource; if only one player is owed it, they take what remains. | Implemented | [Production shortage handling](./shared/rules.ts#L390) applies the shortage rule per resource. |
| ROB-01 | A 7 produces no resources. Each player with more than seven resource cards returns half, rounded down, before the robber moves. | Implemented | [Discard calculation](./shared/rules.ts#L427) and [discard action](./shared/rules.ts#L525). Development cards are not part of resource hand counts. |
| ROB-02 | Move the robber to another hex and take one random resource from one opponent with a building there; choose among eligible opponents when there is more than one. | Implemented | [Robber resolution](./shared/rules.ts#L351) transfers automatically for one target and requires an eligible target when several exist. The reducer rejects a null target; a regression test covers this case. |

### Trading, building, and cards

| ID | Requirement | Status | Implementation notes |
| --- | --- | --- | --- |
| TRADE-01 | Trade with the bank at 4:1, or at 3:1/2:1 when a settlement or city controls the corresponding harbour; take a different resource that the bank has. | Implemented | [Bank rates and trade](./shared/rules.ts#L638) enforce the rates, port access, and bank availability. |
| TRADE-02 | On the active player's turn, players may negotiate with that player; they may not trade with each other or the supply on someone else's turn. | Implemented | New offers and bank trades require the main phase and current player; off-turn responses apply only to an active offer in [trade handling](./shared/rules.ts#L654). |
| TRADE-03 | Player trades cannot give cards away, including by exchanging the same resource type for itself. | Implemented | [Offer validation](./shared/rules.ts#L654) rejects bundles with any resource type on both sides; a regression test verifies that a net-gift offer is rejected. |
| TRADE-04 | A responder may accept, reject, or counteroffer; the active player may continue negotiations and settle an accepted deal. | Partial | Offers can be accepted or declined and settled, but the [trade response UI](./src/ui/Modals.tsx#L412) has no counteroffer flow or action. |
| BUILD-01 | Pay the specified resource costs; roads connect to the player's network and cannot pass through an opponent's building; settlements obey the distance rule and connect to the player's road. | Implemented | [Costs and piece limits](./shared/types.ts#L38) plus [build validation](./shared/rules.ts#L565) enforce these requirements. |
| BUILD-02 | Cities replace the player's settlements; settlements score 1 point, cities 2, and roads score none. Piece supplies limit further construction. | Implemented | [City upgrades](./shared/rules.ts#L599), [piece limits](./shared/types.ts#L45), and [public scoring](./shared/rules.ts#L189). |
| CARD-01 | Buy from the finite deck at the listed cost. Cards stay hidden, cannot be traded, and do not count toward the seven-card resource discard. | Implemented | The [deck](./shared/rules.ts#L28), [purchase action](./shared/rules.ts#L617), and [redacted player view](./shared/redact.ts#L74) support this. |
| CARD-02 | Implement Knight, Road Building, Invention (called “Year of Plenty” in this app), Monopoly, and Victory Point effects. | Implemented | The [development-card reducer](./shared/rules.ts#L728) implements the effects; the two names for the two-resource card refer to the same effect. |
| CARD-03 | A player may play one non-point development card per turn, not one bought that turn. A Knight activates the robber; Victory Point cards remain hidden until needed to win and may be revealed even if bought that turn. | Implemented | [Card play restrictions and effects](./shared/rules.ts#L728), hidden-point [redaction](./shared/redact.ts#L65), and [winner checking](./shared/rules.ts#L245). |

### Awards and winning

| ID | Requirement | Status | Implementation notes |
| --- | --- | --- | --- |
| AWARD-01 | The longest continuous road must be at least five segments and is worth 2 points. Opponent buildings can break it; ties do not improperly remove an incumbent holder. | Implemented | [Longest-road calculation and award](./shared/rules.ts#L159) and [award updates](./shared/rules.ts#L212). |
| AWARD-02 | The player with at least three played Knights and the largest army gets 2 points; a larger army takes the award. | Implemented | [Largest Army update](./shared/rules.ts#L236). |
| WIN-01 | Count settlements, cities, awards, and Victory Point cards. A player reaches victory at 10 points during their turn; the game ends immediately. | Implemented | [Public and total scores](./shared/rules.ts#L189) and [winner check](./shared/rules.ts#L245). |

## Gaps to close for strict rulebook parity

These are remaining behavior discrepancies in the authoritative game flow:

1. **Support counteroffers, or explicitly document the reduced trading rules.**
   The current server action model and UI only support accepting or declining
   an offer.
2. **Choose the starting player according to the rulebook.** Add a dice-based
   initiative flow before the draft; add deterministic tests for ties and
   ordering.
3. **Decide whether “Beginner” promises the complete fixed setup.** To match
   the book, pre-place the prescribed starting pieces; otherwise label it as a
   fixed board with the app's normal draft.

The variable setup's number-token dealing procedure is also different from the
PDF's letter-order procedure. If exact setup reproducibility matters, implement
that sequence rather than only enforcing the separated-red-token constraint.

## Out-of-scope modes to label clearly

- Two-player rooms are supported, but this PDF does not define a two-player
  variant. Treat this as a house rule, not strict base-game parity.
- The large map uses a 5–6 player extension board recipe, but does not make the
  app a complete implementation of that extension. Do not imply extension
  support unless its additional rules and player count are implemented.
