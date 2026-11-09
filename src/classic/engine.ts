/**
 * Classic Okey rules engine: a pure reducer over plain JSON state.
 */

import { type ApplyResult, deal, fail, removeTile, replaceAt, type Seat } from '../core/game'
import { nextInt, seedRng } from '../core/rng'
import { isOkey, type TileId, tileFace } from '../core/tiles'
import { checkWinningHand, findWinningDiscards, isSingleColor, suggestDiscard } from './helpers'
import type {
  ClassicAction,
  ClassicAllowedActions,
  ClassicEvent,
  ClassicFinish,
  ClassicHandResult,
  ClassicOptions,
  ClassicPlayerView,
  ClassicResolvedOptions,
  ClassicState,
} from './types'

type Result = ApplyResult<ClassicState, ClassicEvent>

const HAND_SIZE = 14

function resolveOptions(options: ClassicOptions): ClassicResolvedOptions {
  const resolved: ClassicResolvedOptions = {
    players: options.players ?? 4,
    teams: options.teams ?? false,
    scoring: options.scoring ?? 'deduct',
    startingScore: options.startingScore ?? 20,
    winPoints: options.winPoints ?? 2,
    okeyFinishMultiplier: options.okeyFinishMultiplier ?? 2,
    pairsFinishMultiplier: options.pairsFinishMultiplier ?? 2,
    singleColorMultiplier: options.singleColorMultiplier ?? 1,
    allowPairs: options.allowPairs ?? true,
    indicatorPoints: options.indicatorPoints ?? 1,
    indicatorDrawable: options.indicatorDrawable ?? false,
    maxHands: options.maxHands ?? null,
  }
  if (![2, 3, 4].includes(resolved.players)) throw new RangeError('players must be 2, 3 or 4')
  if (resolved.teams && resolved.players !== 4) {
    throw new RangeError('Partnership play needs exactly 4 players')
  }
  if (resolved.startingScore <= 0) throw new RangeError('startingScore must be positive')
  if (resolved.maxHands !== null && resolved.maxHands < 1) {
    throw new RangeError('maxHands must be at least 1')
  }
  return resolved
}

/** The side a seat scores for: its team in partnership play, otherwise itself. */
export function sideOf(state: Pick<ClassicState, 'options'>, seat: Seat): number {
  return state.options.teams ? seat % 2 : seat
}

function sideCount(options: ClassicResolvedOptions): number {
  return options.teams ? 2 : options.players
}

function startHand(
  base: Pick<ClassicState, 'options' | 'rng' | 'scores'>,
  handNumber: number,
  dealer: Seat,
  deck?: readonly TileId[],
): { state: ClassicState; event: ClassicEvent } {
  const { options } = base
  const starter = (dealer + 1) % options.players
  const dealt = deal({
    rng: base.rng,
    players: options.players,
    handSize: HAND_SIZE,
    starter,
    deck,
  })
  const state: ClassicState = {
    game: 'classic',
    options,
    rng: dealt.rng,
    phase: 'playing',
    handNumber,
    dealer,
    scores: base.scores,
    indicator: dealt.indicator,
    okey: dealt.okey,
    racks: dealt.racks,
    drawPile: options.indicatorDrawable ? [...dealt.drawPile, dealt.indicator] : dealt.drawPile,
    discards: dealt.racks.map(() => []),
    turn: starter,
    step: 'discard',
    drawn: null,
    mustFinish: false,
    acted: dealt.racks.map(() => false),
    indicatorShownBy: null,
    result: null,
    winners: null,
  }
  return {
    state,
    event: { type: 'handStarted', handNumber, dealer, starter, indicator: dealt.indicator },
  }
}

/** Creates a match and deals its first hand. Throws on invalid options. */
export function createGame(options: ClassicOptions = {}): ClassicState {
  const resolved = resolveOptions(options)
  let rng = seedRng(options.seed ?? 0)
  let dealer = options.firstDealer
  if (dealer === undefined) {
    ;[dealer, rng] = nextInt(rng, resolved.players)
  } else if (!Number.isInteger(dealer) || dealer < 0 || dealer >= resolved.players) {
    throw new RangeError('firstDealer is not a seat')
  }
  const scores = Array.from({ length: sideCount(resolved) }, () => resolved.startingScore)
  return startHand({ options: resolved, rng, scores }, 1, dealer, options.deck).state
}

function bestSides(scores: readonly number[], lowest: boolean): number[] {
  const target = lowest ? Math.min(...scores) : Math.max(...scores)
  return scores.flatMap((score, side) => (score === target ? [side] : []))
}

function endHand(
  state: ClassicState,
  result: ClassicHandResult,
  hand: readonly TileId[] | null,
): Result {
  const scores =
    result.outcome === 'win'
      ? state.scores.map((s, i) => s + (result.deltas[i] ?? 0))
      : state.scores
  const { options } = state
  const outOfPoints = scores.some((s) => s <= 0)
  const outOfHands = options.maxHands !== null && state.handNumber >= options.maxHands
  const over = outOfPoints || outOfHands
  // In countdown scoring the lowest score is the best one.
  const winners = over ? bestSides(scores, options.scoring === 'countdown') : null
  const next: ClassicState = {
    ...state,
    phase: over ? 'matchOver' : 'handOver',
    scores,
    result,
    winners,
    drawn: null,
    mustFinish: false,
  }
  const events: ClassicEvent[] = [{ type: 'handEnded', result, scores, hand }]
  if (winners) events.push({ type: 'matchEnded', winners, scores })
  return { ok: true, state: next, events }
}

function pointDeltas(state: ClassicState, seat: Seat, points: number): number[] {
  const side = sideOf(state, seat)
  return state.scores.map((_, i) =>
    state.options.scoring === 'countdown' ? (i === side ? -points : 0) : i === side ? 0 : -points,
  )
}

function indicatorTwin(state: ClassicState, seat: Seat): TileId | undefined {
  const indicator = tileFace(state.indicator)
  return (state.racks[seat] ?? []).find((id) => {
    const face = tileFace(id)
    return (
      id !== state.indicator &&
      face.kind === 'number' &&
      indicator.kind === 'number' &&
      face.color === indicator.color &&
      face.number === indicator.number
    )
  })
}

function previousSeat(state: ClassicState): Seat {
  return (state.turn + state.options.players - 1) % state.options.players
}

function checkTurn(state: ClassicState, player: Seat, step: 'draw' | 'discard'): Result | null {
  if (player !== state.turn) return fail('NOT_YOUR_TURN', `It is seat ${state.turn}'s turn`)
  if (state.step !== step) return fail('WRONG_STEP', `The player must ${state.step} now`)
  return null
}

/**
 * Applies an action. Never mutates `state` and never throws for a rule
 * violation; an illegal action comes back as `{ ok: false, error }`.
 */
export function apply(state: ClassicState, action: ClassicAction): Result {
  if (action.type === 'nextHand') {
    if (state.phase === 'matchOver') return fail('MATCH_OVER', 'The match is over')
    if (state.phase !== 'handOver') return fail('HAND_IN_PROGRESS', 'The hand is still in progress')
    const dealer = (state.dealer + 1) % state.options.players
    const started = startHand(state, state.handNumber + 1, dealer)
    return { ok: true, state: started.state, events: [started.event] }
  }

  if (state.phase === 'matchOver') return fail('MATCH_OVER', 'The match is over')
  if (state.phase === 'handOver') return fail('HAND_OVER', 'The hand is over; start the next one')
  const player = action.player
  const rack = state.racks[player]
  if (!Number.isInteger(player) || !rack) return fail('INVALID_PLAYER', `No seat ${player}`)

  switch (action.type) {
    case 'showIndicator': {
      const points = state.options.indicatorPoints
      if (points <= 0) return fail('INDICATOR_DISABLED', 'Showing the indicator is disabled')
      if (state.indicatorShownBy !== null || state.acted[player]) {
        return fail('INDICATOR_TOO_LATE', 'The indicator can only be shown before your first move')
      }
      const tile = indicatorTwin(state, player)
      if (tile === undefined)
        return fail('INDICATOR_NOT_HELD', 'You do not hold the indicator tile')
      const deltas = pointDeltas(state, player, points)
      return {
        ok: true,
        state: {
          ...state,
          indicatorShownBy: player,
          scores: state.scores.map((s, i) => s + (deltas[i] as number)),
        },
        events: [{ type: 'indicatorShown', player, tile, deltas }],
      }
    }

    case 'draw': {
      const wrong = checkTurn(state, player, 'draw')
      if (wrong) return wrong
      const acted = replaceAt(state.acted, player, true)
      if (action.from === 'pile') {
        const tile = state.drawPile[0]
        if (tile === undefined) return fail('PILE_EMPTY', 'The draw pile is empty')
        return {
          ok: true,
          state: {
            ...state,
            drawPile: state.drawPile.slice(1),
            racks: replaceAt(state.racks, player, [...rack, tile]),
            step: 'discard',
            drawn: tile,
            acted,
          },
          events: [{ type: 'tileDrawn', player, from: 'pile', tile }],
        }
      }
      if (action.from !== 'discard') return fail('UNKNOWN_ACTION', 'Unknown draw source')
      const from = previousSeat(state)
      const pile = state.discards[from] ?? []
      const tile = pile[pile.length - 1]
      if (tile === undefined) return fail('NO_DISCARD', 'There is no discard to take')
      const lastChance = state.drawPile.length === 0
      const nextRack = [...rack, tile]
      if (lastChance && findWinningDiscards(nextRack, state.okey, state.options).length === 0) {
        return fail(
          'NOT_A_WINNING_HAND',
          'With the pile empty the discard may only be taken to finish',
        )
      }
      return {
        ok: true,
        state: {
          ...state,
          discards: replaceAt(state.discards, from, pile.slice(0, -1)),
          racks: replaceAt(state.racks, player, nextRack),
          step: 'discard',
          drawn: tile,
          mustFinish: lastChance,
          acted,
        },
        events: [{ type: 'tileDrawn', player, from: 'discard', tile }],
      }
    }

    case 'pass': {
      const wrong = checkTurn(state, player, 'draw')
      if (wrong) return wrong
      if (state.drawPile.length > 0)
        return fail('PILE_NOT_EMPTY', 'You must draw while tiles remain')
      return endHand(state, { outcome: 'void' }, null)
    }

    case 'discard': {
      const wrong = checkTurn(state, player, 'discard')
      if (wrong) return wrong
      if (state.mustFinish) {
        return fail('NOT_ALLOWED', 'The last discard was taken to finish; you must finish')
      }
      const nextRack = removeTile(rack, action.tile)
      if (!nextRack) return fail('TILE_NOT_IN_RACK', 'That tile is not in your rack')
      return {
        ok: true,
        state: {
          ...state,
          racks: replaceAt(state.racks, player, nextRack),
          discards: replaceAt(state.discards, player, [
            ...(state.discards[player] ?? []),
            action.tile,
          ]),
          turn: (player + 1) % state.options.players,
          step: 'draw',
          drawn: null,
          acted: replaceAt(state.acted, player, true),
        },
        events: [{ type: 'tileDiscarded', player, tile: action.tile }],
      }
    }

    case 'finish': {
      const wrong = checkTurn(state, player, 'discard')
      if (wrong) return wrong
      const hand = removeTile(rack, action.tile)
      if (!hand) return fail('TILE_NOT_IN_RACK', 'That tile is not in your rack')
      const winning = checkWinningHand(hand, state.okey, state.options)
      if (!winning)
        return fail('NOT_A_WINNING_HAND', 'The remaining tiles do not form a winning hand')
      const { options } = state
      const finish: ClassicFinish = {
        pairs: winning.kind === 'pairs',
        okeyDiscard: isOkey(action.tile, state.okey),
        singleColor: options.singleColorMultiplier !== 1 && isSingleColor(hand, state.okey),
      }
      const points =
        options.winPoints *
        (finish.pairs ? options.pairsFinishMultiplier : 1) *
        (finish.okeyDiscard ? options.okeyFinishMultiplier : 1) *
        (finish.singleColor ? options.singleColorMultiplier : 1)
      const result: ClassicHandResult = {
        outcome: 'win',
        winner: player,
        finish,
        points,
        deltas: pointDeltas(state, player, points),
      }
      return endHand(
        {
          ...state,
          racks: replaceAt(state.racks, player, hand),
          acted: replaceAt(state.acted, player, true),
        },
        result,
        hand,
      )
    }

    default:
      return fail('UNKNOWN_ACTION', 'Unknown action')
  }
}

/** Lists what a player may do right now. */
export function getAllowedActions(state: ClassicState, player: Seat): ClassicAllowedActions {
  const none: ClassicAllowedActions = {
    drawFromPile: false,
    drawFromDiscard: false,
    discard: false,
    finish: false,
    showIndicator: false,
    pass: false,
    nextHand: state.phase === 'handOver',
  }
  const rack = state.racks[player]
  if (state.phase !== 'playing' || !rack) return none
  const showIndicator =
    state.options.indicatorPoints > 0 &&
    state.indicatorShownBy === null &&
    !state.acted[player] &&
    indicatorTwin(state, player) !== undefined
  if (player !== state.turn) return { ...none, showIndicator }
  if (state.step === 'draw') {
    const pileEmpty = state.drawPile.length === 0
    const top = (state.discards[previousSeat(state)] ?? []).at(-1)
    const canTake =
      top !== undefined &&
      (!pileEmpty || findWinningDiscards([...rack, top], state.okey, state.options).length > 0)
    return {
      ...none,
      showIndicator,
      drawFromPile: !pileEmpty,
      drawFromDiscard: canTake,
      pass: pileEmpty,
    }
  }
  return {
    ...none,
    showIndicator,
    discard: !state.mustFinish,
    finish: findWinningDiscards(rack, state.okey, state.options).length > 0,
  }
}

/**
 * The move to make for a player who ran out of time or left: draw from the
 * pile and throw the drawn tile back. Returns `null` when no player is due.
 */
export function getTimeoutAction(state: ClassicState): ClassicAction | null {
  if (state.phase !== 'playing') return null
  const player = state.turn
  const rack = state.racks[player] ?? []
  if (state.step === 'draw') {
    return state.drawPile.length > 0
      ? { type: 'draw', player, from: 'pile' }
      : { type: 'pass', player }
  }
  if (state.mustFinish) {
    const [win] = findWinningDiscards(rack, state.okey, state.options)
    if (win) return { type: 'finish', player, tile: win.tile }
  }
  const tile =
    state.drawn !== null && !isOkey(state.drawn, state.okey)
      ? state.drawn
      : suggestDiscard(rack, state.okey)
  return { type: 'discard', player, tile }
}

/** The state as one player may see it: other racks and the pile are reduced to counts. */
export function getPlayerView(state: ClassicState, viewer: Seat): ClassicPlayerView {
  const won =
    state.phase !== 'playing' && state.result?.outcome === 'win' ? state.result.winner : -1
  return {
    game: 'classic',
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
    revealedRacks: state.racks.map((r, seat) => (seat === won ? r : null)),
    drawPileSize: state.drawPile.length,
    discards: state.discards,
    turn: state.turn,
    step: state.step,
    drawn: viewer === state.turn ? state.drawn : null,
    mustFinish: state.mustFinish,
    indicatorShownBy: state.indicatorShownBy,
    result: state.result,
    winners: state.winners,
  }
}

/** Hides from `viewer` what they may not know: tiles other players drew from the pile. */
export function redactEvents(events: readonly ClassicEvent[], viewer: Seat): ClassicEvent[] {
  return events.map((event) =>
    event.type === 'tileDrawn' && event.from === 'pile' && event.player !== viewer
      ? { ...event, tile: null }
      : event,
  )
}

/** Rebuilds a state from options and an action log. Throws if an action is illegal. */
export function replay(options: ClassicOptions, actions: readonly ClassicAction[]): ClassicState {
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
