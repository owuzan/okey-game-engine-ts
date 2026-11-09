# okey-game-engine-ts

A rules engine for the Turkish tile games **Okey** and **Okey 101**, written in TypeScript.

- **Both games, with the common table variants as options:** partnership or individual play (eşli / eşsiz), the rising opening barrier (katlamalı / katlamasız), pairs, okey finishes, penalties and more.
- **A pure reducer over plain JSON state.** `apply(state, action)` returns a new state and a list of events. No classes, no I/O, no timers.
- **Deterministic.** The same seed and actions give the same game on every platform.
- **Hidden information handled for you.** `getPlayerView` and `redactEvents` produce what one player may see.
- **Rack helpers.** Exact solvers for the best runs arrangement (seri dizim) and pairs arrangement (çift dizim), a two-row rack layout, and finders for winning discards, openings and lay-offs.
- **Zero runtime dependencies.** Runs in Node 20+, browsers, React Native and edge runtimes. Ships ESM, CommonJS and type declarations.

It is a rules engine only: no UI, networking, bots or chip economy.

```sh
npm install okey-game-engine-ts
```

## Contents

- [Quick start](#quick-start)
- [Concepts](#concepts)
- [Classic Okey](#classic-okey): [rules](#classic-okey-rules), [actions](#classic-actions), [options](#classic-options)
- [Okey 101](#okey-101): [rules](#okey-101-rules), [actions](#okey-101-actions), [options](#okey-101-options)
- [Running a table](#running-a-table)
- [Rack helpers](#rack-helpers)
- [Errors](#errors)
- [Rule sources and limits](#rule-sources-and-limits)

## Quick start

```ts
import { classic } from 'okey-game-engine-ts'

let state = classic.createGame({ seed: 'table-42' })

// The starter holds 15 tiles and begins by discarding.
const starter = state.turn
const result = classic.apply(state, {
  type: 'discard',
  player: starter,
  tile: state.racks[starter][0],
})

if (result.ok) {
  state = result.state
  console.log(result.events) // [{ type: 'tileDiscarded', player, tile }]
} else {
  console.log(result.error.code) // e.g. 'NOT_YOUR_TURN'
}
```

The package has four entry points. The root exports the two games as namespaces plus every helper; the others export the same things flat.

```ts
import { classic, okey101, arrangeRuns } from 'okey-game-engine-ts'
import { createGame, apply } from 'okey-game-engine-ts/classic'
import { createGame, apply } from 'okey-game-engine-ts/okey101'
import { arrangeRuns, parseTiles } from 'okey-game-engine-ts/helpers'
```

## Concepts

### Tiles

There are 106 tiles: the numbers 1 to 13 in four colours, two copies of each, plus two false jokers.

A tile is an integer from 0 to 105, so state stays plain JSON and the two copies of a face stay distinct. `tileFace(id)` returns `{ kind: 'number', color, number }` or `{ kind: 'falseJoker' }`.

For tests and debugging there is a text notation: a colour letter and a number, with `jk` for a false joker.

| Letter | Colour |
|---|---|
| `r` | red |
| `y` | yellow |
| `b` | blue |
| `k` | black |

```ts
import { formatTiles, parseTiles } from 'okey-game-engine-ts'

const tiles = parseTiles('r5 r5 y13 jk') // four distinct tile ids
formatTiles(tiles) // 'r5 r5 y13 jk'
```

### Indicator, okey and false joker

- **Indicator (gösterge):** one tile is turned face up at the start of each hand. It is never a false joker.
- **Okey:** the tile one above the indicator in the same colour; an indicator of 13 makes the 1 the okey. Both copies are wild and may stand for any tile.
- **False joker (sahte okey):** not wild. It stands for the okey's own face and nothing else. With a red 4 as indicator, the red 5s are okeys and a false joker plays as a red 5.

```ts
import { okeyFromIndicator, resolveTile } from 'okey-game-engine-ts'

const okey = okeyFromIndicator(state.indicator) // { color: 'red', number: 5 }; also at state.okey
resolveTile(tile, okey) // { wild: true } or { wild: false, color, number }
```

### Melds

| Meld | Turkish | Definition |
|---|---|---|
| Run | seri | Three or more consecutive numbers of one colour |
| Group | grup | Three or four tiles of one number, all different colours |
| Pair | çift | Two tiles with the same colour and number |

An okey can replace any tile in any meld, including one half of a pair.

The 1 is low (1-2-3). In **classic Okey** it may also follow 13 (12-13-1), but never both at once: 13-1-2 is not a run. In **Okey 101** a 1 never follows 13.

### Seats, sides, hands and matches

- **Seat:** a player's position, numbered from 0. Play passes from seat `n` to seat `n + 1`, and a player may take the discard of the seat before them.
- **Side:** who a seat scores for. In individual play (eşsiz) each seat is its own side. In partnership play (eşli) seats 0 and 2 play against seats 1 and 3.
- **Hand (el):** one deal. The dealer's next seat is the starter and holds one extra tile.
- **Match:** a series of hands with a running score. The deal passes to the next seat each hand.

Games can be played by 2, 3 or 4 players. Partnership play needs 4.

## Classic Okey

### Classic Okey rules

**Deal.** Every player gets 14 tiles and the starter gets 15. With four players that leaves 48 tiles in the draw pile.

**Turns.** The starter begins by discarding one tile without drawing. After that each turn is:

1. Draw the top tile of the pile, or take the tile the previous player just discarded.
2. Discard one tile.

No melds are laid on the table during play. A hand stays hidden until its owner goes out.

**Going out.** On your turn, with 15 tiles in hand, you go out by discarding one tile so that the other 14 form a winning hand:

- **Runs and groups:** all 14 tiles split into runs and groups, for example 3 + 3 + 4 + 4.
- **Seven pairs (çift):** all 14 tiles form seven pairs.

**Scoring.** Every side starts with 20 points. When a player goes out, every other side loses points:

| Finish | Points lost by each other side |
|---|---|
| Ordinary win | 2 |
| Okey finish (okey atarak bitme): the final discard is an okey | 4 |
| Seven pairs | 4 |
| Seven pairs with an okey as the final discard | 8 |

Discarding a false joker to go out is an ordinary win.

**Showing the indicator (gösterge göstermek).** A player who holds the twin of the indicator may show it before making their first move of the hand. Every other side loses 1 point at once.

**When the pile runs out.** The player to move may take the last discard only if it lets them go out. Otherwise they pass and the hand ends with no winner and no points.

**End of the match.** The match ends when a side reaches 0 points or less. The side with the most points wins.

**Partnership play.** The winner's partner loses nothing; only the opposing team does. A team shares one score.

### Classic actions

| Action | Fields | Effect |
|---|---|---|
| `draw` | `player`, `from: 'pile' \| 'discard'` | Draw from the pile or take the previous player's discard |
| `discard` | `player`, `tile` | Discard and end the turn |
| `finish` | `player`, `tile` | Go out: discard `tile` and show the other fourteen |
| `showIndicator` | `player` | Show the indicator's twin; allowed out of turn, before your first move |
| `pass` | `player` | Only when the pile is empty: decline the last discard, ending the hand |
| `nextHand` | | Deal the next hand after one has ended |

You never send an arrangement with `finish`. The engine works out whether the fourteen tiles form a winning hand, and counts it as pairs when both readings are possible, since pairs score more.

### Classic options

| Option | Default | Meaning |
|---|---|---|
| `players` | `4` | 2, 3 or 4 |
| `teams` | `false` | Partnership play |
| `seed` | `0` | Number or string; drives the shuffle and the first dealer |
| `scoring` | `'deduct'` | `'deduct'`: losers lose points and the highest score wins. `'countdown'` (düşme): the winner subtracts the points instead, and the first side to reach 0 wins |
| `startingScore` | `20` | |
| `winPoints` | `2` | Points for an ordinary win |
| `okeyFinishMultiplier` | `2` | Applied for an okey finish |
| `pairsFinishMultiplier` | `2` | Applied for seven pairs; stacks with the okey finish |
| `singleColorMultiplier` | `1` | Set to 2 to double a winning hand of a single colour |
| `allowPairs` | `true` | Whether seven pairs is a winning hand |
| `indicatorPoints` | `1` | Points for showing the indicator; 0 disables showing |
| `indicatorDrawable` | `false` | Makes the indicator the last tile of the pile |
| `maxHands` | `null` | End the match after this many hands |
| `firstDealer` | from seed | Fix the first dealer |
| `deck` | shuffled | Fix the whole tile order of the first hand (tests, replays) |

## Okey 101

### Okey 101 rules

**Deal.** Every player gets 21 tiles and the starter gets 22. With four players that leaves 20 tiles in the draw pile.

**Turns.** The starter begins without drawing. Each turn is:

1. Draw from the pile, or take the previous player's discard.
2. Optionally lay tiles on the table: open, lay further melds, lay off, or swap an okey.
3. Discard one tile.

**Opening (el açmak).** A player's first melds must meet the opening barrier in a single turn:

- **Runs and groups** worth at least **101 points**. Each tile counts its number, and an okey counts as the tile it stands for.
- **Pairs:** at least **five pairs**.

A player is either a runs player or a pairs player for the whole hand. After opening:

| | Runs opener | Pairs opener |
|---|---|---|
| Lay new runs and groups | yes | no |
| Lay new pairs | only once some player has opened with pairs | yes |
| Lay off on runs and groups | yes | yes |

If every player opens with pairs, nobody can go out; the hand is void and dealt again by the same dealer.

**Taking the discard (yandan taş almak).** A taken discard cannot be kept in the rack. It must reach the table in the same turn, and for a player who has not opened it must be part of their opening. Holding an identical tile counts: either copy may be laid. A player who cannot use the tile puts it back and draws from the pile instead.

**Laying off (işlemek).** A player who has opened may add tiles to any run or group on the table, their own or anyone else's: to either end of a run, or as the fourth colour of a group. Pairs cannot be extended, and melds cannot be split or rearranged. Laying off is allowed in the same turn as opening.

**Taking an okey from the table (yerden okey almak).** A player who has opened may replace an okey on the table with the real tile it stands for, and take the okey. This works only where the okey's identity is certain: in any run, and in a group once it has four tiles. An okey in a group of three could be either missing colour, so it cannot be taken, and neither can an okey in a pair.

**Penalties (ceza).** Each costs 101 points, added to the player's score for the hand:

- Discarding a tile that fits a meld on the table (işlek taş). This applies even to a player who has not opened.
- Discarding an okey.

The discard that goes out is never penalised.

**Going out.** Discard your last tile after laying all the others. You must always keep one tile to discard.

**From hand (elden bitme).** A player who has not opened and lays every tile but one in a single turn goes out "from hand". The 101 barrier does not apply, and the win is doubled. By default this needs that nobody else has opened yet.

**Scoring a hand.** Lower is better.

| Player | Score for the hand |
|---|---|
| Winner | −101 |
| Opened with runs and groups | Sum of the tiles left in hand |
| Opened with pairs | Twice the sum of the tiles left in hand |
| Never opened | 202 |

An okey left in an opened hand counts 101 instead of its number. A false joker counts as the okey's number. Penalties are added on top.

**Multipliers.** Each of these doubles every score in the table above, and they stack:

| Finish | Winner | Unopened player |
|---|---|---|
| Ordinary | −101 | 202 |
| Final discard is an okey | −202 | 404 |
| Winner had opened with pairs | −202 | 404 |
| From hand | −202 | 404 |
| Any two of the above | −404 | 808 |

Penalties are not multiplied.

**When the pile runs out.** The player to move may take the last discard if they can use it, or pass. On a pass the hand ends with no winner: opened players count their tiles, unopened players get 202.

**Katlamalı (rising barrier).** In this variant each opening in a hand must beat the previous one: after an opening of 110 the next player needs 111, and after five pairs the next pairs opener needs six. The points barrier and the pairs barrier rise separately and both reset every hand. Scores are not multiplied by this variant. A finish from hand ignores the barrier and does not raise it.

**Partnership play.** Partners open separately and may lay off on each other's melds like anyone else's. Scores are kept per player and the partners' totals are added. The winner's partner scores 0 for the hand, apart from any penalties.

**End of the match.** A match lasts a fixed number of hands. The side with the lowest total wins.

### Okey 101 actions

| Action | Fields | Effect |
|---|---|---|
| `draw` | `player`, `from: 'pile' \| 'discard'` | Draw from the pile or take the previous player's discard |
| `returnDiscard` | `player` | Put a taken discard back and draw from the pile instead |
| `meld` | `player`, `melds: TileId[][]` | Lay melds from the rack. For a player who has not opened, this is the opening |
| `layOff` | `player`, `tile`, `meld` (id) | Add a tile to a run or group on the table |
| `swapOkey` | `player`, `tile`, `meld` (id) | Replace an okey on the table with `tile` and take the okey |
| `discard` | `player`, `tile` | Discard and end the turn; discarding the last tile goes out |
| `pass` | `player` | Only when the pile is empty: decline the last discard, ending the hand |
| `nextHand` | | Deal the next hand after one has ended |

An unopened player's `meld` is read as a pairs opening when every meld has two tiles, and as a runs opening otherwise. Melds on the table are in `state.table`, each with an `id`, an `owner`, its `tiles` and the `faces` they stand for.

```ts
import { okey101 } from 'okey-game-engine-ts'

let state = okey101.createGame({ seed: 7, teams: true, escalation: 'all', hands: 7 })
const me = state.turn

// Ask the solver for the best opening and lay it.
const { points } = okey101.requiredOpening(state, me)
const best = okey101.findBestOpening(state.racks[me], state.okey, points)
if (best.opens) {
  const result = okey101.apply(state, {
    type: 'meld',
    player: me,
    melds: best.arrangement.melds.map((meld) => meld.tiles),
  })
  if (result.ok) state = result.state
}

// Lay off whatever fits the table.
for (const { tile, meld } of okey101.findLayoffs(state.racks[me], state.table, state.okey)) {
  const result = okey101.apply(state, { type: 'layOff', player: me, tile, meld })
  if (result.ok) state = result.state
}
```

### Okey 101 options

| Option | Default | Meaning |
|---|---|---|
| `players` | `4` | 2, 3 or 4 |
| `teams` | `false` | Partnership play |
| `seed` | `0` | Number or string |
| `hands` | `5` | Scored hands in the match |
| `escalation` | `'off'` | Katlamalı. `'off'`: fixed barrier (katlamasız). `'all'`: every earlier opening raises your barrier. `'opponents'`: only the other team's openings do |
| `openingThreshold` | `101` | Points needed to open with runs and groups |
| `minPairs` | `5` | Pairs needed to open with pairs |
| `okeySwap` | `true` | Whether okeys may be taken from the table |
| `pairsAfterPairsOpener` | `true` | Whether runs openers may lay pairs once someone has opened with pairs |
| `eldenNeedsClosedTable` | `true` | Whether going out from hand needs that nobody else has opened |
| `penaltyPoints` | `101` | Size of an in-play penalty |
| `penalizeLayableDiscard` | `true` | Penalise discarding a tile that fits the table |
| `penalizeOkeyDiscard` | `true` | Penalise discarding an okey |
| `penalizeInvalidOpening` | `false` | `false`: an invalid opening is refused with an error. `true`: it is accepted as a move that costs a penalty and lays nothing |
| `penalizeReturnedDiscard` | `false` | Penalise taking the discard and putting it back |
| `takenDiscardFactor` | `0` | Live-table rule: when your discard is taken and used, you pay the tile's number times this factor. Tables that play it use 10 |
| `winBonus` | `101` | What the winner scores, negated |
| `unopenedPenalty` | `202` | Hand score of a player who never opened |
| `okeyInHandPoints` | `101` | What an okey left in an opened hand counts |
| `pileExhausted` | `'score'` | `'score'`: hands are scored with no winner. `'void'`: the hand is replayed and only okeys in hand and in-play penalties count |
| `firstDealer` | from seed | Fix the first dealer |
| `deck` | shuffled | Fix the whole tile order of the first hand |

## Running a table

Both games expose the same functions, shown here for classic Okey.

```ts
import { classic } from 'okey-game-engine-ts'

// Server: keep the full state, send each player only what they may see.
const result = classic.apply(state, action)
if (result.ok) {
  state = result.state
  for (const seat of [0, 1, 2, 3]) {
    send(seat, {
      view: classic.getPlayerView(state, seat),
      events: classic.redactEvents(result.events, seat),
    })
  }
}
```

| Function | Purpose |
|---|---|
| `createGame(options)` | Create a match and deal the first hand |
| `apply(state, action)` | Apply an action; returns the new state and events, or an error |
| `getPlayerView(state, seat)` | The state as one player may see it: other racks and the pile become counts |
| `redactEvents(events, seat)` | Hide the tiles other players drew from the pile |
| `getAllowedActions(state, seat)` | What the player may do right now, as booleans |
| `getTimeoutAction(state)` | A safe default move for the player whose turn it is |
| `replay(options, actions)` | Rebuild a state from an action log |
| `sideOf(state, seat)` | The side a seat scores for |

**State.** `state.phase` is `'playing'`, `'handOver'` or `'matchOver'`. The state is plain JSON: store it with `JSON.stringify` and load it with `JSON.parse`. `state.result` describes the last finished hand and `state.winners` lists the winning sides once the match is over; a tie lists more than one.

**Starting the next hand.** The engine does not decide when the next hand begins. Send `{ type: 'nextHand' }` when your table is ready.

**Time limits and absent players.** The engine has no clock. Keep the timer yourself, and when it runs out apply `getTimeoutAction(state)`: it draws from the pile and discards without giving away an okey or, in Okey 101, a penalised tile.

**Events.** Each successful action returns events for animation and for broadcasting: `handStarted`, `tileDrawn`, `tileDiscarded`, `handEnded`, `matchEnded`, plus `indicatorShown` in classic Okey and `opened`, `meldsLaid`, `tileLaidOff`, `okeySwapped`, `discardReturned` and `penalty` in Okey 101.

**Determinism.** Pass `seed` to reproduce a match, or `deck` to fix the exact tile order of the first hand: the indicator first, then the starter's rack, then each following seat's rack, then the pile in drawing order.

## Rack helpers

These need only a list of tiles and the okey, so a client can run them on its own rack without the full state.

```ts
import {
  arrangePairs,
  arrangeRuns,
  formatTiles,
  layoutRack,
  parseFace,
  parseTiles,
} from 'okey-game-engine-ts'

const okey = parseFace('k9') // black 9
const rack = parseTiles('r1 r2 r3 y5 b5 k5 b7 b8 k9 y1 r12')

const runs = arrangeRuns(rack, okey) // seri dizim: most tiles in runs and groups
runs.melds.map((m) => formatTiles(m.tiles)) // ['r1 r2 r3', 'y5 b5 k5', 'b7 b8 k9']
formatTiles(runs.leftover) // 'y1 r12'

arrangeRuns(rack, okey, { objective: 'points', highOne: false }) // Okey 101: most points
arrangePairs(rack, okey) // çift dizim: most pairs

layoutRack(runs, { rows: 2, columns: 13 }) // (TileId | null)[][] for a two-row rack
```

| Helper | Purpose |
|---|---|
| `arrangeRuns(tiles, okey, options?)` | Best split into runs and groups. `objective: 'tiles'` (default) or `'points'`; `highOne: false` for Okey 101. The result is optimal, not a heuristic |
| `arrangePairs(tiles, okey)` | Most pairs; okeys go to the highest unpaired tiles |
| `layoutRack(arrangement, { rows, columns })` | Places melds as blocks on a rack with gaps between them |
| `sortByColor(tiles, okey?)`, `sortByNumber(tiles, okey?)` | Simple sorts; with `okey`, okeys go last |
| `analyzeMeld(tiles, okey, options?)` | Validate one meld and learn what each okey stands for; `null` if invalid |
| `extendMeld(meld, tile, okey, rules?)` | Add a tile to a run or group; `null` if it does not fit |
| `classic.checkWinningHand(tiles, okey)` | Whether 14 tiles win, and how |
| `classic.findWinningDiscards(tiles, okey)` | From 15 tiles, every discard that goes out, best first |
| `classic.suggestDiscard(tiles, okey)` | A reasonable tile to throw away |
| `okey101.findBestOpening(tiles, okey, required?)` | Highest-scoring runs and groups, and whether they open |
| `okey101.findPairsOpening(tiles, okey, required?)` | Most pairs, and whether they open |
| `okey101.requiredOpening(state, seat)` | The barrier right now, given the rising-barrier rule |
| `okey101.findLayoffs(tiles, table, okey)` | Tiles that fit melds on the table |
| `okey101.findOkeySwaps(tiles, table, okey)` | Okeys on the table that a tile in hand can replace |
| `okey101.isLayable(tile, table, okey)` | Whether discarding this tile would be penalised |
| `okey101.handPenalty(tiles, okey)` | What the tiles left in hand count |
| `okey101.sideTotals(state)` | Running totals per side |

## Errors

Breaking a rule never throws. `apply` returns `{ ok: false, error: { code, message } }` and leaves the state untouched. Switch on `code`; `message` is English text for debugging.

| Code | Meaning |
|---|---|
| `NOT_YOUR_TURN`, `WRONG_STEP` | Out of turn, or drawing and discarding in the wrong order |
| `INVALID_PLAYER`, `UNKNOWN_ACTION` | No such seat or action |
| `HAND_OVER`, `HAND_IN_PROGRESS`, `MATCH_OVER` | The action does not fit the current phase |
| `TILE_NOT_IN_RACK`, `DUPLICATE_TILE` | A tile is not held, or is used twice |
| `PILE_EMPTY`, `PILE_NOT_EMPTY`, `NO_DISCARD` | Nothing to draw, a pass while tiles remain, or nothing to take |
| `NOT_A_WINNING_HAND` | Classic: the tiles do not go out |
| `INDICATOR_NOT_HELD`, `INDICATOR_TOO_LATE`, `INDICATOR_DISABLED` | Classic: showing the indicator is not possible |
| `INVALID_MELD`, `OPENING_TOO_LOW`, `TOO_FEW_PAIRS` | 101: the melds are invalid or do not meet the barrier |
| `NOT_OPENED` | 101: laying off or swapping before opening |
| `MUST_USE_TAKEN_TILE` | 101: the taken discard has not reached the table |
| `INVALID_LAYOFF`, `INVALID_SWAP`, `UNKNOWN_MELD` | 101: the tile does not fit, or there is no such meld |
| `NOT_ALLOWED` | The move is ruled out here, for example laying your last tile |

Only programming mistakes throw: invalid options, a malformed `deck`, an invalid tile id, or an illegal action inside `replay`.

## Rule sources and limits

The rules follow pagat.com, Wikipedia and the published rule pages of online okey platforms. Where sources disagree, the most common behaviour is the default and the alternative is an option. The in-app rules of the largest mobile titles are not published, so check the options against the platform you want to match.

Not supported:

- Bots and strategy. The engine offers solvers and a safe timeout move only.
- Chips, pots (çanak) and rankings.
- Elimination play, where players at zero leave the table.
- Rarely documented house rules: the double-okey finish, pairing with the indicator, coloured scoring (renkli okey), riziko, and a per-turn limit on lay-offs.

## License

MIT
