/**
 * Okey 101 rules engine: a pure reducer over plain JSON state.
 */

import {
  type ApplyResult,
  deal,
  type ErrorCode,
  fail,
  removeTile,
  removeTiles,
  replaceAt,
  type Seat,
} from '../core/game'
import { analyzeMeld, extendMeld, type Meld } from '../core/melds'
import { nextInt, seedRng } from '../core/rng'
import { isOkey, resolveTile, type TileId, tileFace } from '../core/tiles'
import {
  findLayoffs,
  findOkeySwaps,
  handPenalty,
  isLayable,
  MELD_RULES,
  okeySwapIndex,
  suggestDiscard,
} from './helpers'
import type {
  Okey101Action,
  Okey101AllowedActions,
  Okey101Event,
  Okey101Finish,
  Okey101HandResult,
  Okey101Options,
  Okey101PlayerView,
  Okey101ResolvedOptions,
  Okey101State,
  Opening,
  PenaltyReason,
  TableMeld,
} from './types'

type Result = ApplyResult<Okey101State, Okey101Event>

const HAND_SIZE = 21

function resolveOptions(options: Okey101Options): Okey101ResolvedOptions {
  const resolved: Okey101ResolvedOptions = {
    players: options.players ?? 4,
    teams: options.teams ?? false,
    hands: options.hands ?? 5,
    escalation: options.escalation ?? 'off',
    openingThreshold: options.openingThreshold ?? 101,
    minPairs: options.minPairs ?? 5,
    okeySwap: options.okeySwap ?? true,
    pairsAfterPairsOpener: options.pairsAfterPairsOpener ?? true,
    eldenNeedsClosedTable: options.eldenNeedsClosedTable ?? true,
    penaltyPoints: options.penaltyPoints ?? 101,
    penalizeInvalidOpening: options.penalizeInvalidOpening ?? false,
    penalizeLayableDiscard: options.penalizeLayableDiscard ?? true,
    penalizeOkeyDiscard: options.penalizeOkeyDiscard ?? true,
    penalizeReturnedDiscard: options.penalizeReturnedDiscard ?? false,
    takenDiscardFactor: options.takenDiscardFactor ?? 0,
    winBonus: options.winBonus ?? 101,
    unopenedPenalty: options.unopenedPenalty ?? 202,
    okeyInHandPoints: options.okeyInHandPoints ?? 101,
    pileExhausted: options.pileExhausted ?? 'score',
  }
  if (![2, 3, 4].includes(resolved.players)) throw new RangeError('players must be 2, 3 or 4')
  if (resolved.teams && resolved.players !== 4) {
    throw new RangeError('Partnership play needs exactly 4 players')
  }
  if (!Number.isInteger(resolved.hands) || resolved.hands < 1) {
    throw new RangeError('hands must be a positive integer')
  }
  if (resolved.minPairs < 1) throw new RangeError('minPairs must be at least 1')
  return resolved
}

/** The side a seat plays for: its team in partnership play, otherwise itself. */
export function sideOf(state: Pick<Okey101State, 'options'>, seat: Seat): number {
  return state.options.teams ? seat % 2 : seat
}

/** Running totals per side: per seat, or the partners' sum in partnership play. */
export function sideTotals(state: Pick<Okey101State, 'options' | 'scores'>): number[] {
  const totals: number[] = Array.from(
    { length: state.options.teams ? 2 : state.options.players },
    () => 0,
  )
  state.scores.forEach((score, seat) => {
    const side = sideOf(state, seat)
    totals[side] = (totals[side] as number) + score
  })
  return totals
}

function startHand(
  base: Pick<Okey101State, 'options' | 'rng' | 'scores'>,
  handNumber: number,
  dealer: Seat,
  deck?: readonly TileId[],
): { state: Okey101State; event: Okey101Event } {
  const { options } = base
  const starter = (dealer + 1) % options.players
  const dealt = deal({
    rng: base.rng,
    players: options.players,
    handSize: HAND_SIZE,
    starter,
    deck,
  })
  const state: Okey101State = {
    game: 'okey101',
    options,
    rng: dealt.rng,
    phase: 'playing',
    handNumber,
    dealer,
    scores: base.scores,
    indicator: dealt.indicator,
    okey: dealt.okey,
    racks: dealt.racks,
    drawPile: dealt.drawPile,
    discards: dealt.racks.map(() => []),
    table: [],
    nextMeldId: 1,
    openings: [],
    penalties: dealt.racks.map(() => 0),
    turn: starter,
    step: 'play',
    drawn: null,
    taken: null,
    result: null,
    winners: null,
  }
  return {
    state,
    event: { type: 'handStarted', handNumber, dealer, starter, indicator: dealt.indicator },
  }
}

/** Creates a match and deals its first hand. Throws on invalid options. */
export function createGame(options: Okey101Options = {}): Okey101State {
  const resolved = resolveOptions(options)
  let rng = seedRng(options.seed ?? 0)
  let dealer = options.firstDealer
  if (dealer === undefined) {
    ;[dealer, rng] = nextInt(rng, resolved.players)
  } else if (!Number.isInteger(dealer) || dealer < 0 || dealer >= resolved.players) {
    throw new RangeError('firstDealer is not a seat')
  }
  const scores = Array.from({ length: resolved.players }, () => 0)
  return startHand({ options: resolved, rng, scores }, 1, dealer, options.deck).state
}

function openingOf(state: Okey101State, player: Seat): Opening | undefined {
  return state.openings.find((o) => o.player === player)
}

/** What an opening must reach right now for `player`, given the escalation rule. */
export function requiredOpening(
  state: Okey101State,
  player: Seat,
): { points: number; pairs: number } {
  const { options } = state
  let points = options.openingThreshold
  let pairs = options.minPairs
  if (options.escalation === 'off') return { points, pairs }
  for (const opening of state.openings) {
    // An opening that went out from hand never met a barrier, so it sets none.
    if (opening.elden) continue
    const binds =
      options.escalation === 'all' || sideOf(state, opening.player) !== sideOf(state, player)
    if (!binds) continue
    if (opening.kind === 'runs') points = Math.max(points, opening.value + 1)
    else pairs = Math.max(pairs, opening.value + 1)
  }
  return { points, pairs }
}

function previousSeat(state: Okey101State): Seat {
  return (state.turn + state.options.players - 1) % state.options.players
}

function sameFace(a: TileId, b: TileId): boolean {
  const fa = tileFace(a)
  const fb = tileFace(b)
  if (fa.kind === 'falseJoker' || fb.kind === 'falseJoker') return fa.kind === fb.kind
  return fa.color === fb.color && fa.number === fb.number
}

function withPenalty(
  state: Okey101State,
  player: Seat,
  reason: PenaltyReason,
  points: number,
): { state: Okey101State; event: Okey101Event } {
  return {
    state: {
      ...state,
      penalties: replaceAt(state.penalties, player, (state.penalties[player] ?? 0) + points),
    },
    event: { type: 'penalty', player, reason, points },
  }
}

/**
 * Marks a taken discard as used once a tile of the same face reaches the
 * table, charging the discarder under the live-table rule if enabled.
 */
function settleTaken(
  state: Okey101State,
  used: readonly TileId[],
): { state: Okey101State; events: Okey101Event[] } | null {
  const taken = state.taken
  if (taken === null) return { state, events: [] }
  if (!used.some((tile) => sameFace(tile, taken))) return null
  const cleared = { ...state, taken: null }
  const factor = state.options.takenDiscardFactor
  if (factor <= 0) return { state: cleared, events: [] }
  const r = resolveTile(taken, state.okey)
  const number = r.wild ? state.okey.number : r.number
  const charged = withPenalty(cleared, previousSeat(state), 'discardTaken', number * factor)
  return { state: charged.state, events: [charged.event] }
}

function endHand(
  state: Okey101State,
  outcome: Okey101HandResult['outcome'],
  winner: Seat | null,
  finish: Okey101Finish | null,
): Result {
  const { options, okey } = state
  const flags = finish ? [finish.okeyDiscard, finish.pairs, finish.elden].filter(Boolean).length : 0
  const multiplier = 2 ** flags
  const handScores = state.racks.map((rack, seat) => {
    const penalties = state.penalties[seat] ?? 0
    if (outcome === 'void') {
      const okeys = rack.filter((tile) => isOkey(tile, okey)).length
      return penalties + okeys * options.okeyInHandPoints
    }
    if (seat === winner) return penalties - options.winBonus * multiplier
    if (winner !== null && options.teams && sideOf(state, seat) === sideOf(state, winner)) {
      return penalties
    }
    const opening = openingOf(state, seat)
    if (!opening) return penalties + options.unopenedPenalty * multiplier
    const sum = handPenalty(rack, okey, options.okeyInHandPoints)
    return penalties + sum * (opening.kind === 'pairs' ? 2 : 1) * multiplier
  })
  const scores = state.scores.map((s, seat) => s + (handScores[seat] as number))
  const result: Okey101HandResult = { outcome, winner, finish, multiplier, handScores }
  const over = outcome !== 'void' && state.handNumber >= options.hands
  let winners: number[] | null = null
  if (over) {
    const totals = sideTotals({ options, scores })
    const best = Math.min(...totals)
    winners = totals.flatMap((total, side) => (total === best ? [side] : []))
  }
  const next: Okey101State = {
    ...state,
    phase: over ? 'matchOver' : 'handOver',
    scores,
    result,
    winners,
    drawn: null,
    taken: null,
  }
  const events: Okey101Event[] = [{ type: 'handEnded', result, scores, racks: state.racks }]
  if (winners) events.push({ type: 'matchEnded', winners, scores })
  return { ok: true, state: next, events }
}

function exhaust(state: Okey101State, events: Okey101Event[]): Result {
  const outcome = state.options.pileExhausted === 'void' ? 'void' : 'exhausted'
  const ended = endHand(state, outcome, null, null)
  return ended.ok ? { ...ended, events: [...events, ...ended.events] } : ended
}

function checkTurn(state: Okey101State, player: Seat, step: 'draw' | 'play'): Result | null {
  if (player !== state.turn) return fail('NOT_YOUR_TURN', `It is seat ${state.turn}'s turn`)
  if (state.step !== step) {
    return fail(
      'WRONG_STEP',
      state.step === 'draw' ? 'Draw a tile first' : 'You have already drawn',
    )
  }
  return null
}

function applyMeld(
  state: Okey101State,
  player: Seat,
  rack: readonly TileId[],
  groups: readonly (readonly TileId[])[],
): Result {
  const { options, okey } = state
  const all = groups.flat()
  if (groups.length === 0 || all.length === 0) return fail('INVALID_MELD', 'No melds given')
  if (new Set(all).size !== all.length) return fail('DUPLICATE_TILE', 'A tile is used twice')
  const rest = removeTiles(rack, all)
  if (!rest) return fail('TILE_NOT_IN_RACK', 'A tile is not in your rack')
  if (rest.length === 0) return fail('NOT_ALLOWED', 'Keep one tile to discard')

  const opening = openingOf(state, player)
  const pairsOpenerExists = state.openings.some((o) => o.kind === 'pairs')
  // An unopened player laying only two-tile melds is opening with pairs.
  const asPairs = opening ? opening.kind === 'pairs' : groups.every((g) => g.length === 2)

  const reject = (code: ErrorCode, message: string): Result => {
    if (opening || !options.penalizeInvalidOpening) return fail(code, message)
    const charged = withPenalty(state, player, 'invalidOpening', options.penaltyPoints)
    return { ok: true, state: charged.state, events: [charged.event] }
  }

  const melds: Meld[] = []
  for (const group of groups) {
    const meld = analyzeMeld(group, okey, MELD_RULES)
    if (!meld) return reject('INVALID_MELD', 'One of the melds is not valid')
    const pairAllowed =
      asPairs || (opening?.kind === 'runs' && options.pairsAfterPairsOpener && pairsOpenerExists)
    if (meld.kind === 'pair' ? !pairAllowed : asPairs) {
      return reject(
        'INVALID_MELD',
        asPairs ? 'A pairs player may only lay pairs' : 'Pairs cannot be laid here',
      )
    }
    melds.push(meld)
  }

  const events: Okey101Event[] = []
  let openings = state.openings
  if (!opening) {
    const required = requiredOpening(state, player)
    let newOpening: Opening
    if (asPairs) {
      if (melds.length < required.pairs) {
        return reject('TOO_FEW_PAIRS', `Opening with pairs needs ${required.pairs} pairs`)
      }
      newOpening = { player, kind: 'pairs', value: melds.length, elden: false }
    } else {
      const points = melds.reduce((sum, m) => sum + m.points, 0)
      const elden =
        rest.length === 1 && (!options.eldenNeedsClosedTable || state.openings.length === 0)
      if (!elden && points < required.points) {
        return reject(
          'OPENING_TOO_LOW',
          `Opening needs ${required.points} points; this is ${points}`,
        )
      }
      newOpening = { player, kind: 'runs', value: points, elden }
    }
    openings = [...openings, newOpening]
    events.push({ type: 'opened', opening: newOpening })
  }

  const settled = settleTaken(state, all)
  if (!settled) return fail('MUST_USE_TAKEN_TILE', 'The tile you took must be part of what you lay')
  const laid: TableMeld[] = melds.map((meld, i) => ({
    ...meld,
    id: state.nextMeldId + i,
    owner: player,
  }))
  events.push({ type: 'meldsLaid', player, melds: laid }, ...settled.events)
  const next: Okey101State = {
    ...settled.state,
    racks: replaceAt(state.racks, player, rest),
    table: [...state.table, ...laid],
    nextMeldId: state.nextMeldId + laid.length,
    openings,
  }
  // Nobody can go out when every player is on pairs: the hand is replayed.
  if (openings.length === options.players && openings.every((o) => o.kind === 'pairs')) {
    const ended = endHand(next, 'void', null, null)
    return ended.ok ? { ...ended, events: [...events, ...ended.events] } : ended
  }
  return { ok: true, state: next, events }
}

/**
 * Applies an action. Never mutates `state` and never throws for a rule
 * violation; an illegal action comes back as `{ ok: false, error }`.
 */
export function apply(state: Okey101State, action: Okey101Action): Result {
  if (action.type === 'nextHand') {
    if (state.phase === 'matchOver') return fail('MATCH_OVER', 'The match is over')
    if (state.phase !== 'handOver') return fail('HAND_IN_PROGRESS', 'The hand is still in progress')
    // A void hand is dealt again by the same dealer and does not count.
    const replayed = state.result?.outcome === 'void'
    const dealer = replayed ? state.dealer : (state.dealer + 1) % state.options.players
    const started = startHand(state, state.handNumber + (replayed ? 0 : 1), dealer)
    return { ok: true, state: started.state, events: [started.event] }
  }

  if (state.phase === 'matchOver') return fail('MATCH_OVER', 'The match is over')
  if (state.phase === 'handOver') return fail('HAND_OVER', 'The hand is over; start the next one')
  const player = action.player
  const rack = state.racks[player]
  if (!Number.isInteger(player) || !rack) return fail('INVALID_PLAYER', `No seat ${player}`)
  const { options, okey } = state

  switch (action.type) {
    case 'draw': {
      const wrong = checkTurn(state, player, 'draw')
      if (wrong) return wrong
      if (action.from === 'pile') {
        const tile = state.drawPile[0]
        if (tile === undefined) return fail('PILE_EMPTY', 'The draw pile is empty')
        return {
          ok: true,
          state: {
            ...state,
            drawPile: state.drawPile.slice(1),
            racks: replaceAt(state.racks, player, [...rack, tile]),
            step: 'play',
            drawn: tile,
          },
          events: [{ type: 'tileDrawn', player, from: 'pile', tile }],
        }
      }
      if (action.from !== 'discard') return fail('UNKNOWN_ACTION', 'Unknown draw source')
      const from = previousSeat(state)
      const pile = state.discards[from] ?? []
      const tile = pile[pile.length - 1]
      if (tile === undefined) return fail('NO_DISCARD', 'There is no discard to take')
      return {
        ok: true,
        state: {
          ...state,
          discards: replaceAt(state.discards, from, pile.slice(0, -1)),
          racks: replaceAt(state.racks, player, [...rack, tile]),
          step: 'play',
          drawn: tile,
          taken: tile,
        },
        events: [{ type: 'tileDrawn', player, from: 'discard', tile }],
      }
    }

    case 'returnDiscard': {
      const wrong = checkTurn(state, player, 'play')
      if (wrong) return wrong
      const taken = state.taken
      const without = taken === null ? null : removeTile(rack, taken)
      if (taken === null || !without)
        return fail('NOT_ALLOWED', 'There is no taken discard to return')
      const from = previousSeat(state)
      let next: Okey101State = {
        ...state,
        taken: null,
        drawn: null,
        racks: replaceAt(state.racks, player, without),
        discards: replaceAt(state.discards, from, [...(state.discards[from] ?? []), taken]),
      }
      const events: Okey101Event[] = [{ type: 'discardReturned', player, tile: taken }]
      if (options.penalizeReturnedDiscard) {
        const charged = withPenalty(next, player, 'returnedDiscard', options.penaltyPoints)
        next = charged.state
        events.push(charged.event)
      }
      const tile = next.drawPile[0]
      if (tile === undefined) return exhaust(next, events)
      events.push({ type: 'tileDrawn', player, from: 'pile', tile })
      return {
        ok: true,
        state: {
          ...next,
          drawPile: next.drawPile.slice(1),
          racks: replaceAt(next.racks, player, [...without, tile]),
          drawn: tile,
        },
        events,
      }
    }

    case 'pass': {
      const wrong = checkTurn(state, player, 'draw')
      if (wrong) return wrong
      if (state.drawPile.length > 0)
        return fail('PILE_NOT_EMPTY', 'You must draw while tiles remain')
      return exhaust(state, [])
    }

    case 'meld': {
      const wrong = checkTurn(state, player, 'play')
      if (wrong) return wrong
      return applyMeld(state, player, rack, action.melds)
    }

    case 'layOff': {
      const wrong = checkTurn(state, player, 'play')
      if (wrong) return wrong
      if (!openingOf(state, player)) return fail('NOT_OPENED', 'Open your hand before laying off')
      const rest = removeTile(rack, action.tile)
      if (!rest) return fail('TILE_NOT_IN_RACK', 'That tile is not in your rack')
      if (rest.length === 0) return fail('NOT_ALLOWED', 'Keep one tile to discard')
      const index = state.table.findIndex((m) => m.id === action.meld)
      const target = state.table[index]
      if (!target) return fail('UNKNOWN_MELD', `No meld ${action.meld} on the table`)
      const extended =
        target.kind === 'pair' ? null : extendMeld(target, action.tile, okey, MELD_RULES)
      if (!extended) return fail('INVALID_LAYOFF', 'That tile does not fit that meld')
      const settled = settleTaken(state, [action.tile])
      if (!settled) return fail('MUST_USE_TAKEN_TILE', 'Use the tile you took first')
      const meld: TableMeld = { ...extended, id: target.id, owner: target.owner }
      return {
        ok: true,
        state: {
          ...settled.state,
          racks: replaceAt(state.racks, player, rest),
          table: replaceAt(state.table, index, meld),
        },
        events: [{ type: 'tileLaidOff', player, tile: action.tile, meld }, ...settled.events],
      }
    }

    case 'swapOkey': {
      const wrong = checkTurn(state, player, 'play')
      if (wrong) return wrong
      if (!options.okeySwap) return fail('NOT_ALLOWED', 'Taking an okey from the table is disabled')
      if (!openingOf(state, player))
        return fail('NOT_OPENED', 'Open your hand before taking an okey')
      const rest = removeTile(rack, action.tile)
      if (!rest) return fail('TILE_NOT_IN_RACK', 'That tile is not in your rack')
      const index = state.table.findIndex((m) => m.id === action.meld)
      const target = state.table[index]
      if (!target) return fail('UNKNOWN_MELD', `No meld ${action.meld} on the table`)
      const at = okeySwapIndex(target, action.tile, okey)
      if (at < 0) return fail('INVALID_SWAP', 'That tile does not replace an okey in that meld')
      const settled = settleTaken(state, [action.tile])
      if (!settled) return fail('MUST_USE_TAKEN_TILE', 'Use the tile you took first')
      const picked = target.tiles[at] as TileId
      const meld: TableMeld = { ...target, tiles: replaceAt(target.tiles, at, action.tile) }
      return {
        ok: true,
        state: {
          ...settled.state,
          racks: replaceAt(state.racks, player, [...rest, picked]),
          table: replaceAt(state.table, index, meld),
        },
        events: [
          { type: 'okeySwapped', player, tile: action.tile, okey: picked, meld },
          ...settled.events,
        ],
      }
    }

    case 'discard': {
      const wrong = checkTurn(state, player, 'play')
      if (wrong) return wrong
      if (state.taken !== null) {
        return fail('MUST_USE_TAKEN_TILE', 'Lay the tile you took, or return it')
      }
      const rest = removeTile(rack, action.tile)
      if (!rest) return fail('TILE_NOT_IN_RACK', 'That tile is not in your rack')
      const okeyDiscard = isOkey(action.tile, okey)
      const discarded: Okey101Event = { type: 'tileDiscarded', player, tile: action.tile }
      const opening = openingOf(state, player)

      if (rest.length === 0 && opening) {
        const finish: Okey101Finish = {
          okeyDiscard,
          pairs: opening.kind === 'pairs',
          elden: opening.elden,
        }
        const ended = endHand(
          { ...state, racks: replaceAt(state.racks, player, rest) },
          'win',
          player,
          finish,
        )
        return ended.ok ? { ...ended, events: [discarded, ...ended.events] } : ended
      }

      let next: Okey101State = {
        ...state,
        racks: replaceAt(state.racks, player, rest),
        discards: replaceAt(state.discards, player, [
          ...(state.discards[player] ?? []),
          action.tile,
        ]),
        turn: (player + 1) % options.players,
        step: 'draw',
        drawn: null,
      }
      const events: Okey101Event[] = [discarded]
      const reason: PenaltyReason | null =
        okeyDiscard && options.penalizeOkeyDiscard
          ? 'okeyDiscard'
          : !okeyDiscard &&
              options.penalizeLayableDiscard &&
              isLayable(action.tile, state.table, okey)
            ? 'layableDiscard'
            : null
      if (reason) {
        const charged = withPenalty(next, player, reason, options.penaltyPoints)
        next = charged.state
        events.push(charged.event)
      }
      return { ok: true, state: next, events }
    }

    default:
      return fail('UNKNOWN_ACTION', 'Unknown action')
  }
}

/** Lists what a player may do right now. */
export function getAllowedActions(state: Okey101State, player: Seat): Okey101AllowedActions {
  const rack = state.racks[player]
  const required = rack ? requiredOpening(state, player) : { points: 0, pairs: 0 }
  const none: Okey101AllowedActions = {
    drawFromPile: false,
    drawFromDiscard: false,
    returnDiscard: false,
    meld: false,
    layOff: false,
    swapOkey: false,
    discard: false,
    pass: false,
    nextHand: state.phase === 'handOver',
    requiredPoints: required.points,
    requiredPairs: required.pairs,
  }
  if (state.phase !== 'playing' || !rack || player !== state.turn) return none
  if (state.step === 'draw') {
    const pileEmpty = state.drawPile.length === 0
    return {
      ...none,
      drawFromPile: !pileEmpty,
      drawFromDiscard: (state.discards[previousSeat(state)] ?? []).length > 0,
      pass: pileEmpty,
    }
  }
  const opened = openingOf(state, player) !== undefined
  // While a taken discard is pending, only moves that use it count.
  const usable =
    state.taken === null ? rack : rack.filter((t) => sameFace(t, state.taken as TileId))
  return {
    ...none,
    returnDiscard: state.taken !== null,
    meld: rack.length >= 3,
    layOff: opened && rack.length >= 2 && findLayoffs(usable, state.table, state.okey).length > 0,
    swapOkey:
      opened && state.options.okeySwap && findOkeySwaps(usable, state.table, state.okey).length > 0,
    discard: state.taken === null,
  }
}

/**
 * The move to make for a player who ran out of time or left: draw from the
 * pile, return a pending discard, and throw away the least costly tile.
 * Returns `null` when no player is due.
 */
export function getTimeoutAction(state: Okey101State): Okey101Action | null {
  if (state.phase !== 'playing') return null
  const player = state.turn
  const rack = state.racks[player] ?? []
  if (state.step === 'draw') {
    return state.drawPile.length > 0
      ? { type: 'draw', player, from: 'pile' }
      : { type: 'pass', player }
  }
  if (state.taken !== null) return { type: 'returnDiscard', player }
  const safe = (tile: TileId) =>
    !isOkey(tile, state.okey) && !isLayable(tile, state.table, state.okey)
  const tile =
    state.drawn !== null && rack.includes(state.drawn) && safe(state.drawn)
      ? state.drawn
      : suggestDiscard(rack, state.table, state.okey)
  return { type: 'discard', player, tile }
}

/** The state as one player may see it: other racks and the pile are reduced to counts. */
export function getPlayerView(state: Okey101State, viewer: Seat): Okey101PlayerView {
  return {
    game: 'okey101',
    viewer,
    options: state.options,
    phase: state.phase,
    handNumber: state.handNumber,
    dealer: state.dealer,
    scores: state.scores,
    indicator: state.indicator,
    okey: state.okey,
    rack: state.racks[viewer] ?? [],
    rackSizes: state.racks.map((r) => r.length),
    revealedRacks: state.phase === 'playing' ? null : state.racks,
    drawPileSize: state.drawPile.length,
    discards: state.discards,
    table: state.table,
    openings: state.openings,
    penalties: state.penalties,
    turn: state.turn,
    step: state.step,
    drawn: viewer === state.turn ? state.drawn : null,
    taken: state.taken,
    result: state.result,
    winners: state.winners,
  }
}

/** Hides from `viewer` what they may not know: tiles other players drew from the pile. */
export function redactEvents(events: readonly Okey101Event[], viewer: Seat): Okey101Event[] {
  return events.map((event) =>
    event.type === 'tileDrawn' && event.from === 'pile' && event.player !== viewer
      ? { ...event, tile: null }
      : event,
  )
}

/** Rebuilds a state from options and an action log. Throws if an action is illegal. */
export function replay(options: Okey101Options, actions: readonly Okey101Action[]): Okey101State {
  let state = createGame(options)
  actions.forEach((action, index) => {
    const result = apply(state, action)
    if (!result.ok) {
      throw new Error(
        `Replay failed at action ${index}: ${result.error.code} ${result.error.message}`,
      )
    }
    state = result.state
  })
  return state
}
