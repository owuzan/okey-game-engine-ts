import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import {
  apply,
  type ClassicAction,
  type ClassicOptions,
  type ClassicState,
  createGame,
  findWinningDiscards,
  getAllowedActions,
  getPlayerView,
  getTimeoutAction,
  redactEvents,
  replay,
} from '../../src/classic'
import { createTileSet, parseTiles, type TileId } from '../../src/core/tiles'
import { buildDeck } from '../support'

// Indicator r4 makes r5 the okey in every scenario below.
const RUNS = 'y1 y2 y3 y4 y5 y6 y7 b1 b2 b3 k1 k2 k3 k4'
const PAIRS = 'y1 y1 y2 y2 y3 y3 b4 b4 b6 b6 k7 k7 k9 k9'

function game(starterHand: string, options: ClassicOptions = {}, others: string[] = []) {
  const deck = buildDeck({
    indicator: 'r4',
    hands: [starterHand, ...others],
    players: options.players,
  })
  // Dealer 3 makes seat 0 the starter.
  return createGame({ firstDealer: 3, deck, ...options })
}

function tile(state: ClassicState, seat: number, notation: string): TileId {
  const wanted = parseTiles(`${notation} ${notation}`)
  const found = state.racks[seat]!.find((id) => wanted.includes(id))
  if (found === undefined) throw new Error(`Seat ${seat} does not hold ${notation}`)
  return found
}

function must(state: ClassicState, action: ClassicAction) {
  const result = apply(state, action)
  if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`)
  return result
}

function errorOf(state: ClassicState, action: ClassicAction) {
  const result = apply(state, action)
  return result.ok ? null : result.error.code
}

describe('dealing', () => {
  it('gives the starter 15 tiles, everyone else 14, and leaves 48 in the pile', () => {
    const state = createGame({ seed: 7 })
    const starter = (state.dealer + 1) % 4
    expect(state.racks.map((r) => r.length)).toEqual(
      [0, 1, 2, 3].map((s) => (s === starter ? 15 : 14)),
    )
    expect(state.drawPile).toHaveLength(48)
    expect(state.turn).toBe(starter)
    expect(state.step).toBe('discard')
    const all = [state.indicator, ...state.racks.flat(), ...state.drawPile]
    expect(all.sort((a, b) => a - b)).toEqual(createTileSet())
  })

  it('never picks a false joker as indicator', () => {
    for (let seed = 0; seed < 200; seed++) {
      expect(createGame({ seed }).indicator).toBeLessThan(104)
    }
  })

  it('supports two and three players', () => {
    expect(createGame({ players: 2 }).drawPile).toHaveLength(106 - 1 - 29)
    expect(createGame({ players: 3 }).racks).toHaveLength(3)
  })

  it('rejects invalid options', () => {
    expect(() => createGame({ players: 5 as 4 })).toThrow(RangeError)
    expect(() => createGame({ players: 3, teams: true })).toThrow(RangeError)
    expect(() => createGame({ firstDealer: 4 })).toThrow(RangeError)
    expect(() => createGame({ deck: [1, 2, 3] })).toThrow(RangeError)
    expect(() => createGame({ startingScore: 0 })).toThrow(RangeError)
  })
})

describe('turn flow', () => {
  it('starts with a discard and then alternates draw and discard', () => {
    let state = game('b13')
    expect(errorOf(state, { type: 'draw', player: 0, from: 'pile' })).toBe('WRONG_STEP')
    expect(errorOf(state, { type: 'discard', player: 1, tile: 0 })).toBe('NOT_YOUR_TURN')
    state = must(state, { type: 'discard', player: 0, tile: tile(state, 0, 'b13') }).state
    expect(state.turn).toBe(1)
    expect(errorOf(state, { type: 'discard', player: 1, tile: state.racks[1]![0]! })).toBe(
      'WRONG_STEP',
    )
    const drawn = must(state, { type: 'draw', player: 1, from: 'pile' })
    expect(drawn.state.racks[1]).toHaveLength(15)
    expect(drawn.state.drawPile).toHaveLength(47)
    expect(drawn.state.drawn).toBe(state.drawPile[0])
  })

  it('lets the next player take the previous discard', () => {
    let state = game('b13')
    const thrown = tile(state, 0, 'b13')
    state = must(state, { type: 'discard', player: 0, tile: thrown }).state
    const taken = must(state, { type: 'draw', player: 1, from: 'discard' })
    expect(taken.state.racks[1]).toContain(thrown)
    expect(taken.state.discards[0]).toEqual([])
    expect(taken.events).toEqual([{ type: 'tileDrawn', player: 1, from: 'discard', tile: thrown }])
  })

  it('reports rule violations without throwing', () => {
    const state = game('b13')
    expect(errorOf(state, { type: 'discard', player: 0, tile: state.racks[1]![0]! })).toBe(
      'TILE_NOT_IN_RACK',
    )
    expect(errorOf(state, { type: 'discard', player: 9, tile: 0 })).toBe('INVALID_PLAYER')
    expect(errorOf(state, { type: 'nextHand' })).toBe('HAND_IN_PROGRESS')
    expect(errorOf(state, { type: 'pass', player: 0 })).toBe('WRONG_STEP')
    expect(errorOf(state, { type: 'bogus' } as unknown as ClassicAction)).toBe('INVALID_PLAYER')
    const next = must(state, { type: 'discard', player: 0, tile: tile(state, 0, 'b13') }).state
    expect(errorOf(next, { type: 'draw', player: 1, from: 'rack' as 'pile' })).toBe(
      'UNKNOWN_ACTION',
    )
    expect(errorOf(next, { type: 'pass', player: 1 })).toBe('PILE_NOT_EMPTY')
    const noDiscard = must(next, { type: 'draw', player: 1, from: 'discard' }).state
    const after = must(noDiscard, {
      type: 'discard',
      player: 1,
      tile: noDiscard.racks[1]![0]!,
    }).state
    const emptied = { ...after, discards: after.discards.map(() => []) }
    expect(errorOf(emptied, { type: 'draw', player: 2, from: 'discard' })).toBe('NO_DISCARD')
  })

  it('does not mutate the input state', () => {
    const state = game('b13')
    const snapshot = JSON.stringify(state)
    apply(state, { type: 'discard', player: 0, tile: tile(state, 0, 'b13') })
    expect(JSON.stringify(state)).toBe(snapshot)
  })
})

describe('finishing', () => {
  it('scores an ordinary win: every other player loses 2', () => {
    const state = game(`${RUNS} b13`)
    const result = must(state, { type: 'finish', player: 0, tile: tile(state, 0, 'b13') })
    expect(result.state.phase).toBe('handOver')
    expect(result.state.scores).toEqual([20, 18, 18, 18])
    expect(result.state.result).toMatchObject({ outcome: 'win', winner: 0, points: 2 })
    expect(result.events[0]).toMatchObject({ type: 'handEnded' })
  })

  it('doubles for finishing by discarding the okey', () => {
    const state = game(`${RUNS} r5`)
    const result = must(state, { type: 'finish', player: 0, tile: tile(state, 0, 'r5') })
    expect(result.state.scores).toEqual([20, 16, 16, 16])
    expect(result.state.result).toMatchObject({ finish: { okeyDiscard: true, pairs: false } })
  })

  it('does not treat a false joker discard as an okey finish', () => {
    const state = game(`${RUNS} jk`)
    const result = must(state, { type: 'finish', player: 0, tile: tile(state, 0, 'jk') })
    expect(result.state.scores).toEqual([20, 18, 18, 18])
  })

  it('doubles for seven pairs and stacks with the okey discard', () => {
    const pairs = game(`${PAIRS} b13`)
    expect(
      must(pairs, { type: 'finish', player: 0, tile: tile(pairs, 0, 'b13') }).state.scores,
    ).toEqual([20, 16, 16, 16])
    const both = game(`${PAIRS} r5`)
    expect(
      must(both, { type: 'finish', player: 0, tile: tile(both, 0, 'r5') }).state.scores,
    ).toEqual([20, 12, 12, 12])
  })

  it('lets an okey complete a pair and the false jokers pair up', () => {
    const state = game('y1 y1 y2 y2 y3 y3 b4 b4 b6 b6 k7 r5 jk jk b13')
    expect(
      must(state, { type: 'finish', player: 0, tile: tile(state, 0, 'b13') }).state.result,
    ).toMatchObject({
      finish: { pairs: true },
    })
  })

  it('rejects pairs when the option is off', () => {
    const state = game(`${PAIRS} b13`, { allowPairs: false })
    expect(errorOf(state, { type: 'finish', player: 0, tile: tile(state, 0, 'b13') })).toBe(
      'NOT_A_WINNING_HAND',
    )
  })

  it('rejects a hand that is not complete', () => {
    const state = game('y1 y2 y3 y4 y5 y6 y7 b1 b2 b3 k1 k2 k3 k6 b13')
    expect(errorOf(state, { type: 'finish', player: 0, tile: tile(state, 0, 'b13') })).toBe(
      'NOT_A_WINNING_HAND',
    )
    expect(errorOf(state, { type: 'finish', player: 0, tile: state.racks[1]![0]! })).toBe(
      'TILE_NOT_IN_RACK',
    )
    expect(getAllowedActions(state, 0).finish).toBe(false)
  })

  it('applies the single-colour multiplier when enabled', () => {
    const hand = 'y1 y2 y3 y4 y5 y6 y7 y8 y9 y10 y11 y12 y13 r5 b13'
    const off = game(hand)
    expect(
      must(off, { type: 'finish', player: 0, tile: tile(off, 0, 'b13') }).state.scores[1],
    ).toBe(18)
    const on = game(hand, { singleColorMultiplier: 2 })
    const result = must(on, { type: 'finish', player: 0, tile: tile(on, 0, 'b13') })
    expect(result.state.scores[1]).toBe(16)
    expect(result.state.result).toMatchObject({ finish: { singleColor: true } })
  })

  it('reveals only the winner hand in views after the hand', () => {
    const state = game(`${RUNS} b13`)
    const done = must(state, { type: 'finish', player: 0, tile: tile(state, 0, 'b13') }).state
    const view = getPlayerView(done, 2)
    expect(view.revealedRacks[0]).toHaveLength(14)
    expect(view.revealedRacks[1]).toBeNull()
    expect(errorOf(done, { type: 'draw', player: 1, from: 'pile' })).toBe('HAND_OVER')
  })
})

describe('showing the indicator', () => {
  it('costs every other player a point when shown before the first move', () => {
    const state = game('b13', {}, ['r4'])
    expect(getAllowedActions(state, 1).showIndicator).toBe(true)
    const result = must(state, { type: 'showIndicator', player: 1 })
    expect(result.state.scores).toEqual([19, 20, 19, 19])
    expect(result.state.indicatorShownBy).toBe(1)
    expect(errorOf(result.state, { type: 'showIndicator', player: 1 })).toBe('INDICATOR_TOO_LATE')
  })

  it('is refused without the tile, after moving, or when disabled', () => {
    let state = game('b13', {}, ['r4'])
    expect(errorOf(state, { type: 'showIndicator', player: 2 })).toBe('INDICATOR_NOT_HELD')
    state = must(state, { type: 'discard', player: 0, tile: tile(state, 0, 'b13') }).state
    state = must(state, { type: 'draw', player: 1, from: 'pile' }).state
    expect(errorOf(state, { type: 'showIndicator', player: 1 })).toBe('INDICATOR_TOO_LATE')
    const disabled = game('b13', { indicatorPoints: 0 }, ['r4'])
    expect(errorOf(disabled, { type: 'showIndicator', player: 1 })).toBe('INDICATOR_DISABLED')
    expect(getAllowedActions(disabled, 1).showIndicator).toBe(false)
  })
})

describe('scoring variants', () => {
  it('spares the partner in partnership play', () => {
    const state = game(`${RUNS} b13`, { teams: true }, ['r4'])
    expect(state.scores).toEqual([20, 20])
    const shown = must(state, { type: 'showIndicator', player: 1 }).state
    expect(shown.scores).toEqual([19, 20])
    const done = must(shown, { type: 'finish', player: 0, tile: tile(shown, 0, 'b13') }).state
    expect(done.scores).toEqual([19, 18])
  })

  it('counts the winner down in countdown scoring and ends at zero', () => {
    const state = game(`${RUNS} r5`, { scoring: 'countdown', startingScore: 4 })
    const done = must(state, { type: 'finish', player: 0, tile: tile(state, 0, 'r5') }).state
    expect(done.scores).toEqual([0, 4, 4, 4])
    expect(done.phase).toBe('matchOver')
    expect(done.winners).toEqual([0])
  })

  it('ends a deduct match when someone reaches zero; the highest score wins', () => {
    const state = game(`${RUNS} b13`, { startingScore: 2 })
    const result = must(state, { type: 'finish', player: 0, tile: tile(state, 0, 'b13') })
    expect(result.state.phase).toBe('matchOver')
    expect(result.state.winners).toEqual([0])
    expect(result.events.at(-1)).toMatchObject({ type: 'matchEnded', winners: [0] })
    expect(errorOf(result.state, { type: 'nextHand' })).toBe('MATCH_OVER')
    expect(errorOf(result.state, { type: 'draw', player: 1, from: 'pile' })).toBe('MATCH_OVER')
    expect(getTimeoutAction(result.state)).toBeNull()
  })

  it('ends after maxHands', () => {
    const state = game(`${RUNS} b13`, { maxHands: 1 })
    const done = must(state, { type: 'finish', player: 0, tile: tile(state, 0, 'b13') }).state
    expect(done.phase).toBe('matchOver')
    expect(done.winners).toEqual([0])
  })
})

describe('hands and dealers', () => {
  it('passes the deal to the next seat and gives the new starter 15 tiles', () => {
    const state = game(`${RUNS} b13`)
    const done = must(state, { type: 'finish', player: 0, tile: tile(state, 0, 'b13') }).state
    expect(getAllowedActions(done, 0).nextHand).toBe(true)
    const next = must(done, { type: 'nextHand' })
    expect(next.state.dealer).toBe(0)
    expect(next.state.turn).toBe(1)
    expect(next.state.handNumber).toBe(2)
    expect(next.state.racks[1]).toHaveLength(15)
    expect(next.state.scores).toEqual([20, 18, 18, 18])
    expect(next.events[0]).toMatchObject({ type: 'handStarted', handNumber: 2, starter: 1 })
  })
})

function playOut(state: ClassicState, until: (s: ClassicState) => boolean): ClassicState {
  let current = state
  while (!until(current)) {
    const action = getTimeoutAction(current)
    if (!action) throw new Error('No timeout action')
    current = must(current, action).state
  }
  return current
}

describe('an exhausted pile', () => {
  const drained = () => playOut(game('b13'), (s) => s.drawPile.length === 0 && s.step === 'draw')

  it('ends the hand with no winner when the player passes', () => {
    const state = drained()
    expect(errorOf(state, { type: 'draw', player: state.turn, from: 'pile' })).toBe('PILE_EMPTY')
    expect(getAllowedActions(state, state.turn)).toMatchObject({ pass: true, drawFromPile: false })
    const result = must(state, { type: 'pass', player: state.turn })
    expect(result.state.phase).toBe('handOver')
    expect(result.state.result).toEqual({ outcome: 'void' })
    expect(result.state.scores).toEqual([20, 20, 20, 20])
  })

  it('only lets the last discard be taken to finish', () => {
    const state = drained()
    const scattered = parseTiles('r1 y3 b6 k8 r10 y12 b1 k3 r7 y9 b11 k13 y6 b9')
    const hopeless = {
      ...state,
      racks: state.racks.map((r, s) => (s === state.turn ? scattered : r)),
    }
    expect(errorOf(hopeless, { type: 'draw', player: state.turn, from: 'discard' })).toBe(
      'NOT_A_WINNING_HAND',
    )
    expect(getAllowedActions(hopeless, state.turn).drawFromDiscard).toBe(false)
    // Hand the player a rack that the available discard completes.
    const previous = (state.turn + 3) % 4
    const top = state.discards[previous]!.at(-1)!
    const taken = new Set([top])
    const filler = parseTiles(RUNS, taken)
    const rigged = { ...state, racks: state.racks.map((r, s) => (s === state.turn ? filler : r)) }
    expect(getAllowedActions(rigged, state.turn).drawFromDiscard).toBe(true)
    const took = must(rigged, { type: 'draw', player: state.turn, from: 'discard' }).state
    expect(took.mustFinish).toBe(true)
    expect(errorOf(took, { type: 'discard', player: state.turn, tile: top })).toBe('NOT_ALLOWED')
    expect(getAllowedActions(took, state.turn)).toMatchObject({ discard: false, finish: true })
    const timeout = getTimeoutAction(took)
    expect(timeout).toMatchObject({ type: 'finish' })
    expect(must(took, timeout!).state.result).toMatchObject({ outcome: 'win' })
  })

  it('makes the indicator the last drawable tile when the option is on', () => {
    const state = game('b13', { indicatorDrawable: true })
    expect(state.drawPile).toHaveLength(49)
    expect(state.drawPile.at(-1)).toBe(state.indicator)
  })
})

describe('hidden information', () => {
  it('shows a player their own rack and only counts for the rest', () => {
    const state = game('b13')
    const view = getPlayerView(state, 2)
    expect(view.rack).toEqual(state.racks[2])
    expect(view.rackSizes).toEqual([15, 14, 14, 14])
    expect(view.drawPileSize).toBe(48)
    expect(view.revealedRacks).toEqual([null, null, null, null])
    expect(Object.keys(view)).not.toContain('racks')
    expect(Object.keys(view)).not.toContain('drawPile')
    expect(Object.keys(view)).not.toContain('rng')
  })

  it('hides pile draws from other players', () => {
    let state = game('b13')
    state = must(state, { type: 'discard', player: 0, tile: tile(state, 0, 'b13') }).state
    const { events } = must(state, { type: 'draw', player: 1, from: 'pile' })
    expect(redactEvents(events, 1)[0]).toMatchObject({ tile: state.drawPile[0] })
    expect(redactEvents(events, 0)[0]).toMatchObject({ tile: null })
    expect(
      getPlayerView(must(state, { type: 'draw', player: 1, from: 'pile' }).state, 0).drawn,
    ).toBeNull()
  })
})

describe('whole matches', () => {
  it('conserves tiles, survives JSON round trips and is deterministic', () => {
    fc.assert(
      fc.property(
        fc.record({
          seed: fc.integer(),
          players: fc.constantFrom(2 as const, 3 as const, 4 as const),
          takeDiscard: fc.array(fc.boolean(), { minLength: 1, maxLength: 20 }),
        }),
        ({ seed, players, takeDiscard }) => {
          const options: ClassicOptions = { seed, players, maxHands: 2 }
          const log: ClassicAction[] = []
          let state = createGame(options)
          // Two players can pass one tile back and forth forever, so cap the takes.
          let takes = 30
          for (let step = 0; state.phase !== 'matchOver'; step++) {
            expect(step).toBeLessThan(2000)
            let action: ClassicAction | null =
              state.phase === 'handOver' ? { type: 'nextHand' } : getTimeoutAction(state)
            const allowed = state.phase === 'playing' ? getAllowedActions(state, state.turn) : null
            if (allowed?.finish && state.step === 'discard') {
              // Take the win whenever one is on offer.
              const [win] = findWinningDiscards(state.racks[state.turn]!, state.okey)
              action = { type: 'finish', player: state.turn, tile: win!.tile }
            } else if (
              allowed?.drawFromDiscard &&
              allowed.drawFromPile &&
              takeDiscard[step % takeDiscard.length] &&
              takes-- > 0
            ) {
              action = { type: 'draw', player: state.turn, from: 'discard' }
            }
            log.push(action!)
            state = JSON.parse(JSON.stringify(must(state, action!).state))
            if (state.phase === 'playing') {
              const all = [
                ...state.racks.flat(),
                ...state.drawPile,
                ...state.discards.flat(),
                ...(state.options.indicatorDrawable ? [] : [state.indicator]),
              ]
              expect(all.sort((a, b) => a - b)).toEqual(createTileSet())
            }
          }
          expect(replay(options, log)).toEqual(state)
        },
      ),
      { numRuns: 25 },
    )
  }, 30_000)

  it('throws from replay when the log is illegal', () => {
    expect(() => replay({ seed: 1 }, [{ type: 'nextHand' }])).toThrow(/Replay failed at action 0/)
  })
})
