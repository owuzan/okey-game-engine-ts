import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { arrangeRuns, createTileSet, formatTiles, parseTiles, type TileId } from '../../src/helpers'
import {
  apply,
  createGame,
  findBestOpening,
  findLayoffs,
  findPairsOpening,
  getAllowedActions,
  getPlayerView,
  getTimeoutAction,
  handPenalty,
  MELD_RULES,
  type Okey101Action,
  type Okey101Options,
  type Okey101State,
  redactEvents,
  replay,
  requiredOpening,
  sideTotals,
  suggestDiscard,
} from '../../src/okey101'
import { buildDeck } from '../support'

// Indicator r4 makes r5 the okey in every scenario below.
const RUN13 = 'y1 y2 y3 y4 y5 y6 y7 y8 y9 y10 y11 y12 y13' // 91 points
const B4 = 'b1 b2 b3 b4' // 10 points
const K3 = 'k1 k2 k3' // 6 points
/** Three melds worth 105. */
const OPEN_105 = ['r11 r12 r13', 'k10 k11 k12', 'b11 b12 b13']

function game(hands: string[], options: Okey101Options = {}, pile = '') {
  const deck = buildDeck({ indicator: 'r4', hands, pile, handSize: 21, players: options.players })
  // Dealer = last seat makes seat 0 the starter.
  return createGame({ firstDealer: (options.players ?? 4) - 1, deck, ...options })
}

/** Finds tiles in a seat's rack by notation, without reusing a tile. */
function pick(state: Okey101State, seat: number, notation: string): TileId[] {
  const pool = state.racks[seat]!.slice()
  return notation
    .trim()
    .split(/\s+/)
    .map((token) => {
      const index = pool.findIndex((id) => formatTiles([id]) === token)
      if (index < 0) throw new Error(`Seat ${seat} does not hold ${token}`)
      return pool.splice(index, 1)[0]!
    })
}

function must(state: Okey101State, action: Okey101Action) {
  const result = apply(state, action)
  if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`)
  return result
}

function errorOf(state: Okey101State, action: Okey101Action) {
  const result = apply(state, action)
  return result.ok ? null : result.error.code
}

const meld = (state: Okey101State, player: number, ...groups: string[]): Okey101Action => {
  const tiles = pick(state, player, groups.join(' '))
  let at = 0
  const melds = groups.map((g) => {
    const size = g.trim().split(/\s+/).length
    const part = tiles.slice(at, at + size)
    at += size
    return part
  })
  return { type: 'meld', player, melds }
}
const discard = (state: Okey101State, player: number, notation: string): Okey101Action => ({
  type: 'discard',
  player,
  tile: pick(state, player, notation)[0]!,
})
const layOff = (
  state: Okey101State,
  player: number,
  notation: string,
  meldId: number,
): Okey101Action => ({
  type: 'layOff',
  player,
  tile: pick(state, player, notation)[0]!,
  meld: meldId,
})

/** Lets idle players time out until it is `seat`'s turn to draw. */
function skipTo(state: Okey101State, seat: number): Okey101State {
  let current = state
  while (!(current.turn === seat && current.step === 'draw')) {
    current = must(current, getTimeoutAction(current)!).state
  }
  return current
}

describe('dealing', () => {
  it('gives the starter 22 tiles, everyone else 21, and leaves 20 in the pile', () => {
    const state = createGame({ seed: 3 })
    const starter = (state.dealer + 1) % 4
    expect(state.racks.map((r) => r.length)).toEqual(
      [0, 1, 2, 3].map((s) => (s === starter ? 22 : 21)),
    )
    expect(state.drawPile).toHaveLength(20)
    expect(state.step).toBe('play')
    expect(state.scores).toEqual([0, 0, 0, 0])
  })

  it('rejects invalid options', () => {
    expect(() => createGame({ players: 1 as 2 })).toThrow(RangeError)
    expect(() => createGame({ players: 2, teams: true })).toThrow(RangeError)
    expect(() => createGame({ hands: 0 })).toThrow(RangeError)
    expect(() => createGame({ minPairs: 0 })).toThrow(RangeError)
    expect(() => createGame({ firstDealer: -1 })).toThrow(RangeError)
  })
})

describe('opening with runs and groups', () => {
  it('opens at 101 points or more', () => {
    const state = game([[...OPEN_105].join(' ')])
    const result = must(state, meld(state, 0, ...OPEN_105))
    expect(result.state.openings).toEqual([{ player: 0, kind: 'runs', value: 105, elden: false }])
    expect(result.state.table.map((m) => m.kind)).toEqual(['run', 'run', 'run'])
    expect(result.state.racks[0]).toHaveLength(13)
    expect(result.events.map((e) => e.type)).toEqual(['opened', 'meldsLaid'])
  })

  it('refuses an opening below the threshold', () => {
    const state = game(['r11 r12 r13 k10 k11 k12'])
    expect(errorOf(state, meld(state, 0, 'r11 r12 r13', 'k10 k11 k12'))).toBe('OPENING_TOO_LOW')
  })

  it('charges 101 for a refused opening when that option is on', () => {
    const state = game(['r11 r12 r13 k10 k11 k12'], { penalizeInvalidOpening: true })
    const result = must(state, meld(state, 0, 'r11 r12 r13', 'k10 k11 k12'))
    expect(result.state.penalties).toEqual([101, 0, 0, 0])
    expect(result.state.table).toHaveLength(0)
    expect(result.events).toEqual([
      { type: 'penalty', player: 0, reason: 'invalidOpening', points: 101 },
    ])
  })

  it('counts an okey as the tile it stands for', () => {
    const state = game(['y11 r5 y13 k10 k11 k12 b11 b12 b13'])
    const result = must(state, meld(state, 0, 'y11 r5 y13', 'k10 k11 k12', 'b11 b12 b13'))
    expect(result.state.openings[0]?.value).toBe(105)
  })

  it('does not let a 1 follow 13', () => {
    const state = game([`y12 y13 y1 ${OPEN_105.join(' ')}`])
    expect(errorOf(state, meld(state, 0, 'y12 y13 y1', ...OPEN_105))).toBe('INVALID_MELD')
  })

  it('validates the tiles offered', () => {
    const state = game([OPEN_105.join(' ')])
    const [a, b, c] = pick(state, 0, 'r11 r12 r13')
    expect(errorOf(state, { type: 'meld', player: 0, melds: [] })).toBe('INVALID_MELD')
    expect(
      errorOf(state, {
        type: 'meld',
        player: 0,
        melds: [
          [a!, b!, c!],
          [a!, b!, c!],
        ],
      }),
    ).toBe('DUPLICATE_TILE')
    expect(
      errorOf(state, { type: 'meld', player: 0, melds: [[a!, b!, state.racks[1]![0]!]] }),
    ).toBe('TILE_NOT_IN_RACK')
    expect(errorOf(state, { type: 'meld', player: 1, melds: [[a!, b!, c!]] })).toBe('NOT_YOUR_TURN')
    expect(errorOf(state, meld(state, 0, 'r11 r12 k10'))).toBe('INVALID_MELD')
  })

  it('makes other players draw before they play', () => {
    let state = game([OPEN_105.join(' ')], {}, 'y1')
    state = must(state, discard(state, 0, 'r11')).state
    expect(errorOf(state, { type: 'meld', player: 1, melds: [state.racks[1]!.slice(0, 3)] })).toBe(
      'WRONG_STEP',
    )
    expect(errorOf(state, { type: 'discard', player: 1, tile: state.racks[1]![0]! })).toBe(
      'WRONG_STEP',
    )
    const drawn = must(state, { type: 'draw', player: 1, from: 'pile' }).state
    expect(drawn.racks[1]).toHaveLength(22)
    expect(errorOf(drawn, { type: 'draw', player: 1, from: 'pile' })).toBe('WRONG_STEP')
  })
})

describe('opening with pairs', () => {
  const PAIRS5 = ['y1 y1', 'y2 y2', 'y3 y3', 'b4 b4', 'b6 b6']

  it('opens with five pairs', () => {
    const state = game([PAIRS5.join(' ')])
    const result = must(state, meld(state, 0, ...PAIRS5))
    expect(result.state.openings[0]).toMatchObject({ kind: 'pairs', value: 5 })
  })

  it('refuses four pairs', () => {
    const state = game([PAIRS5.join(' ')])
    expect(errorOf(state, meld(state, 0, ...PAIRS5.slice(0, 4)))).toBe('TOO_FEW_PAIRS')
  })

  it('lets an okey complete a pair', () => {
    const state = game(['y1 y1 y2 y2 y3 y3 b4 b4 b6 r5'])
    expect(
      must(state, meld(state, 0, 'y1 y1', 'y2 y2', 'y3 y3', 'b4 b4', 'b6 r5')).state.openings,
    ).toHaveLength(1)
  })

  it('confines a pairs player to pairs, but lets them lay off on runs', () => {
    let state = game([`${PAIRS5.join(' ')} k7 k7 k8 k9 k10 r10`, `${OPEN_105.join(' ')} r9`])
    state = must(state, meld(state, 0, ...PAIRS5)).state
    expect(errorOf(state, meld(state, 0, 'k8 k9 k10'))).toBe('INVALID_MELD')
    state = must(state, meld(state, 0, 'k7 k7')).state
    state = must(state, discard(state, 0, 'k8')).state
    state = must(state, { type: 'draw', player: 1, from: 'pile' }).state
    state = must(state, meld(state, 1, ...OPEN_105)).state
    const run = state.table.find((m) => m.owner === 1 && formatTiles(m.tiles) === 'r11 r12 r13')!
    state = must(state, discard(state, 1, 'r9')).state
    state = skipTo(state, 0)
    state = must(state, { type: 'draw', player: 0, from: 'pile' }).state
    expect(
      must(state, layOff(state, 0, 'r10', run.id)).state.table.find((m) => m.id === run.id)?.tiles,
    ).toHaveLength(4)
  })

  it('lets a runs player lay pairs only once someone has opened with pairs', () => {
    let state = game([`${OPEN_105.join(' ')} k7 k7`, PAIRS5.join(' ')])
    state = must(state, meld(state, 0, ...OPEN_105)).state
    expect(errorOf(state, meld(state, 0, 'k7 k7'))).toBe('INVALID_MELD')
    state = must(state, discard(state, 0, formatTiles([state.racks[0]!.at(-1)!]))).state
    state = must(state, { type: 'draw', player: 1, from: 'pile' }).state
    state = must(state, meld(state, 1, ...PAIRS5)).state
    state = must(state, getTimeoutAction(state)!).state
    state = skipTo(state, 0)
    state = must(state, { type: 'draw', player: 0, from: 'pile' }).state
    expect(must(state, meld(state, 0, 'k7 k7')).state.table.at(-1)?.kind).toBe('pair')
    const strict = { ...state, options: { ...state.options, pairsAfterPairsOpener: false } }
    expect(errorOf(strict, meld(strict, 0, 'k7 k7'))).toBe('INVALID_MELD')
  })

  it('voids the hand when every player opens with pairs, and replays it', () => {
    let state = game([PAIRS5.join(' '), 'k1 k1 k2 k2 k3 k3 b7 b7 b8 b8'], { players: 2 })
    state = must(state, meld(state, 0, ...PAIRS5)).state
    state = must(state, getTimeoutAction(state)!).state
    state = must(state, { type: 'draw', player: 1, from: 'pile' }).state
    const result = must(state, meld(state, 1, 'k1 k1', 'k2 k2', 'k3 k3', 'b7 b7', 'b8 b8'))
    expect(result.state.phase).toBe('handOver')
    expect(result.state.result).toMatchObject({ outcome: 'void', winner: null })
    const next = must(result.state, { type: 'nextHand' }).state
    expect(next.handNumber).toBe(1)
    expect(next.dealer).toBe(state.dealer)
  })
})

describe('laying off', () => {
  it('needs an opened hand, a real meld and a fitting tile', () => {
    let state = game([`${OPEN_105.join(' ')} r10 y5`])
    expect(errorOf(state, layOff(state, 0, 'r10', 1))).toBe('NOT_OPENED')
    state = must(state, meld(state, 0, ...OPEN_105)).state
    expect(errorOf(state, layOff(state, 0, 'r10', 99))).toBe('UNKNOWN_MELD')
    expect(errorOf(state, layOff(state, 0, 'y5', 1))).toBe('INVALID_LAYOFF')
    expect(errorOf(state, { type: 'layOff', player: 0, tile: state.racks[1]![0]!, meld: 1 })).toBe(
      'TILE_NOT_IN_RACK',
    )
    const result = must(state, layOff(state, 0, 'r10', 1))
    expect(formatTiles(result.state.table[0]!.tiles)).toBe('r10 r11 r12 r13')
    expect(result.state.table[0]!.points).toBe(46)
    expect(getAllowedActions(state, 0).layOff).toBe(true)
  })

  it('always leaves a tile to discard', () => {
    const state = game([`${RUN13} ${B4} ${K3} k4 b13`])
    const opened = must(state, meld(state, 0, RUN13, B4, K3)).state
    const one = must(opened, layOff(opened, 0, 'k4', 3)).state
    expect(errorOf(one, layOff(one, 0, 'b13', 1))).toBe('NOT_ALLOWED')
    expect(errorOf(state, meld(state, 0, RUN13, B4, K3, 'k4 b13'))).toBe('NOT_ALLOWED')
  })
})

describe('taking the discard', () => {
  const setup = (options: Okey101Options = {}) => {
    // Seat 0 throws r10; seat 1 can use it in r10 r11 r12.
    let state = game(['r10', 'r11 r12 k10 k11 k12 b11 b12 b13 y9 y10 y11 y12'], options, 'y1')
    state = must(state, discard(state, 0, 'r10')).state
    return must(state, { type: 'draw', player: 1, from: 'discard' }).state
  }

  it('must be used on the table before discarding', () => {
    const state = setup()
    expect(state.taken).not.toBeNull()
    expect(errorOf(state, discard(state, 1, 'y9'))).toBe('MUST_USE_TAKEN_TILE')
    expect(errorOf(state, meld(state, 1, 'k10 k11 k12', 'b11 b12 b13', 'y9 y10 y11 y12'))).toBe(
      'MUST_USE_TAKEN_TILE',
    )
    expect(getAllowedActions(state, 1)).toMatchObject({ discard: false, returnDiscard: true })
  })

  it('opens the hand when it is part of the opening', () => {
    const state = setup()
    const opened = must(
      state,
      meld(state, 1, 'r10 r11 r12', 'k10 k11 k12', 'b11 b12 b13', 'y9 y10 y11'),
    ).state
    expect(opened.taken).toBeNull()
    expect(opened.openings[0]).toMatchObject({ player: 1, value: 132 })
    expect(errorOf(opened, discard(opened, 1, formatTiles([opened.racks[1]![0]!])))).toBeNull()
  })

  it('can be put back, which draws from the pile instead', () => {
    const state = setup()
    const result = must(state, { type: 'returnDiscard', player: 1 })
    expect(result.events.map((e) => e.type)).toEqual(['discardReturned', 'tileDrawn'])
    expect(formatTiles(result.state.discards[0]!)).toBe('r10')
    expect(formatTiles([result.state.drawn!])).toBe('y1')
    expect(result.state.racks[1]).toHaveLength(22)
    expect(result.state.penalties[1]).toBe(0)
    expect(errorOf(result.state, { type: 'returnDiscard', player: 1 })).toBe('NOT_ALLOWED')
  })

  it('costs 101 to put back when that option is on', () => {
    const state = setup({ penalizeReturnedDiscard: true })
    expect(must(state, { type: 'returnDiscard', player: 1 }).state.penalties[1]).toBe(101)
  })

  it('charges the discarder ten times the tile under the live-table rule', () => {
    const state = setup({ takenDiscardFactor: 10 })
    const result = must(
      state,
      meld(state, 1, 'r10 r11 r12', 'k10 k11 k12', 'b11 b12 b13', 'y9 y10 y11'),
    )
    expect(result.state.penalties).toEqual([100, 0, 0, 0])
    expect(result.events.at(-1)).toEqual({
      type: 'penalty',
      player: 0,
      reason: 'discardTaken',
      points: 100,
    })
  })

  it('is satisfied by an identical tile from the rack', () => {
    let state = game(['r10', 'r10 r11 r12 k10 k11 k12 b11 b12 b13 y9 y10 y11'])
    state = must(state, discard(state, 0, 'r10')).state
    state = must(state, { type: 'draw', player: 1, from: 'discard' }).state
    const twin = state.racks[1]!.find((id) => formatTiles([id]) === 'r10' && id !== state.taken)!
    const others = pick(state, 1, 'r11 r12')
    const rest = meld(state, 1, 'k10 k11 k12', 'b11 b12 b13', 'y9 y10 y11') as Extract<
      Okey101Action,
      { type: 'meld' }
    >
    const opened = must(state, {
      type: 'meld',
      player: 1,
      melds: [[twin, ...others], ...rest.melds],
    }).state
    expect(opened.taken).toBeNull()
  })

  it('fails without a discard to take', () => {
    const state = game(['r10'], { players: 2 })
    const next = must(state, discard(state, 0, 'r10')).state
    const drawn = must(next, { type: 'draw', player: 1, from: 'discard' }).state
    const returned = must(drawn, { type: 'returnDiscard', player: 1 }).state
    const after = must(returned, getTimeoutAction(returned)!).state
    const emptied = { ...after, discards: after.discards.map(() => []) }
    expect(errorOf(emptied, { type: 'draw', player: 0, from: 'discard' })).toBe('NO_DISCARD')
    expect(errorOf(emptied, { type: 'draw', player: 0, from: 'x' as 'pile' })).toBe(
      'UNKNOWN_ACTION',
    )
  })
})

describe('taking an okey from the table', () => {
  // Seat 0 opens with an okey standing for y12 and one in a group of nines.
  const SEAT0 = ['y11 r5 y13', 'r9 y9 r5', 'b11 b12 b13', 'k10 k11 k12 k13']
  const SEAT1 = ['r11 r12 r13', 'k10 k11 k12', 'b11 b12 b13']
  const setup = (options: Okey101Options = {}) => {
    let state = game([`${SEAT0.join(' ')} y1`, `${SEAT1.join(' ')} y12 b9 k9`], options)
    state = must(state, meld(state, 0, ...SEAT0)).state
    state = must(state, discard(state, 0, 'y1')).state
    return must(state, { type: 'draw', player: 1, from: 'pile' }).state
  }
  const swap = (state: Okey101State, notation: string, meldId: number): Okey101Action => ({
    type: 'swapOkey',
    player: 1,
    tile: pick(state, 1, notation)[0]!,
    meld: meldId,
  })

  it('needs an opened hand', () => {
    const state = setup()
    expect(errorOf(state, swap(state, 'y12', 1))).toBe('NOT_OPENED')
  })

  it('swaps the real tile into a run and hands over the okey', () => {
    let state = setup()
    state = must(state, meld(state, 1, ...SEAT1)).state
    expect(getAllowedActions(state, 1).swapOkey).toBe(true)
    const result = must(state, swap(state, 'y12', 1))
    expect(formatTiles(result.state.table[0]!.tiles)).toBe('y11 y12 y13')
    expect(formatTiles(result.state.racks[1]!)).toContain('r5')
    expect(result.events[0]).toMatchObject({ type: 'okeySwapped' })
  })

  it('refuses a three-tile group, where the okey could be either colour, until it has four', () => {
    let state = setup()
    state = must(state, meld(state, 1, ...SEAT1)).state
    expect(errorOf(state, swap(state, 'b9', 2))).toBe('INVALID_SWAP')
    state = must(state, layOff(state, 1, 'k9', 2)).state
    expect(must(state, swap(state, 'b9', 2)).state.table[1]!.tiles).toHaveLength(4)
    expect(errorOf(state, swap(state, 'b9', 77))).toBe('UNKNOWN_MELD')
    expect(
      errorOf(state, { type: 'swapOkey', player: 1, tile: state.racks[0]![0]!, meld: 2 }),
    ).toBe('TILE_NOT_IN_RACK')
  })

  it('can be switched off', () => {
    let state = setup({ okeySwap: false })
    state = must(state, meld(state, 1, ...SEAT1)).state
    expect(errorOf(state, swap(state, 'y12', 1))).toBe('NOT_ALLOWED')
  })
})

describe('discard penalties', () => {
  it('charges 101 for throwing a tile that fits the table, opened or not', () => {
    let state = game([`${OPEN_105.join(' ')} r10 y5`, 'r10'])
    state = must(state, meld(state, 0, ...OPEN_105)).state
    const own = must(state, discard(state, 0, 'r10'))
    expect(own.state.penalties[0]).toBe(101)
    expect(own.events.at(-1)).toMatchObject({ type: 'penalty', reason: 'layableDiscard' })
    state = must(state, discard(state, 0, 'y5')).state
    expect(state.penalties[0]).toBe(0)
    state = must(state, { type: 'draw', player: 1, from: 'pile' }).state
    expect(must(state, discard(state, 1, 'r10')).state.penalties[1]).toBe(101)
  })

  it('charges 101 for throwing an okey, once', () => {
    const state = game(['r5 r6 r7 r8'])
    const opened = must(state, discard(state, 0, 'r5'))
    expect(opened.state.penalties[0]).toBe(101)
    expect(opened.events.at(-1)).toMatchObject({ reason: 'okeyDiscard' })
  })

  it('can be switched off', () => {
    const state = game(['r5'], { penalizeOkeyDiscard: false, penalizeLayableDiscard: false })
    expect(must(state, discard(state, 0, 'r5')).state.penalties[0]).toBe(0)
  })
})

describe('going out and scoring', () => {
  const FULL = `${RUN13} ${B4} ${K3}` // twenty tiles, 107 points

  it('scores a normal win: winner -101, unopened players 202', () => {
    const state = game([`${FULL} k4 b13`])
    let s = must(state, meld(state, 0, RUN13, B4, K3)).state
    s = must(s, layOff(s, 0, 'k4', 3)).state
    const result = must(s, discard(s, 0, 'b13'))
    expect(result.state.result).toMatchObject({ outcome: 'win', winner: 0, multiplier: 1 })
    expect(result.state.scores).toEqual([-101, 202, 202, 202])
    expect(result.events.map((e) => e.type)).toEqual(['tileDiscarded', 'handEnded'])
    expect(getPlayerView(result.state, 3).revealedRacks).toHaveLength(4)
  })

  it('does not penalise a going-out discard that fits the table', () => {
    const state = game([`${FULL} k4 k5`])
    let s = must(state, meld(state, 0, RUN13, B4, K3)).state
    s = must(s, layOff(s, 0, 'k4', 3)).state
    expect(must(s, discard(s, 0, 'k5')).state.scores[0]).toBe(-101)
  })

  it('doubles everything for going out on an okey', () => {
    const state = game([`${FULL} k4 r5`])
    let s = must(state, meld(state, 0, RUN13, B4, K3)).state
    s = must(s, layOff(s, 0, 'k4', 3)).state
    const done = must(s, discard(s, 0, 'r5')).state
    expect(done.result).toMatchObject({
      multiplier: 2,
      finish: { okeyDiscard: true, pairs: false, elden: false },
    })
    expect(done.scores).toEqual([-202, 404, 404, 404])
  })

  it('doubles for going out from hand, below the threshold too', () => {
    // Twenty-one tiles worth 97, laid at once.
    const hand = 'y1 y2 y3 y4 y5 y6 y7 y8 y9 y10 y11 y12 b1 b2 b3 b4 b5 k1 k2 k3 k4 b13'
    const state = game([hand])
    const opened = must(
      state,
      meld(state, 0, 'y1 y2 y3 y4 y5 y6 y7 y8 y9 y10 y11 y12', 'b1 b2 b3 b4 b5', 'k1 k2 k3 k4'),
    ).state
    expect(opened.openings[0]).toMatchObject({ value: 103, elden: true })
    const low = game(['y1 y2 y3 y4 y5 y6 y7 y8 y9 b1 b2 b3 b4 b5 b6 k1 k2 k3 k4 k5 k6 b13'])
    const lowOpened = must(
      low,
      meld(low, 0, 'y1 y2 y3 y4 y5 y6 y7 y8 y9', 'b1 b2 b3 b4 b5 b6', 'k1 k2 k3 k4 k5 k6'),
    ).state
    expect(lowOpened.openings[0]).toMatchObject({ value: 87, elden: true })
    const done = must(lowOpened, discard(lowOpened, 0, 'b13')).state
    expect(done.result).toMatchObject({ multiplier: 2, finish: { elden: true } })
    expect(done.scores).toEqual([-202, 404, 404, 404])
  })

  it('counts opened hands by their tiles, doubles pairs players and okeys cost 101', () => {
    let state = game(
      [
        `${RUN13} ${B4} k1 k2 k3 k4 b13`,
        `${OPEN_105.join(' ')} r5`,
        'r1 r1 r2 r2 r3 r3 b7 b7 b8 b8',
      ],
      {},
    )
    state = must(state, meld(state, 0, RUN13, B4)).state
    state = must(state, discard(state, 0, 'b13')).state
    state = must(state, { type: 'draw', player: 1, from: 'pile' }).state
    state = must(state, meld(state, 1, ...OPEN_105)).state
    state = must(
      state,
      discard(state, 1, formatTiles([suggestDiscard(state.racks[1]!, state.table, state.okey)])),
    ).state
    state = must(state, { type: 'draw', player: 2, from: 'pile' }).state
    state = must(state, meld(state, 2, 'r1 r1', 'r2 r2', 'r3 r3', 'b7 b7', 'b8 b8')).state
    state = must(
      state,
      discard(state, 2, formatTiles([suggestDiscard(state.racks[2]!, state.table, state.okey)])),
    ).state
    state = skipTo(state, 0)
    state = must(state, { type: 'draw', player: 0, from: 'pile' }).state
    const drawn = formatTiles([state.drawn!])
    state = must(state, meld(state, 0, K3)).state
    state = must(state, layOff(state, 0, 'k4', state.table.at(-1)!.id)).state
    const before = state
    const done = must(state, discard(state, 0, drawn)).state
    const seat1 = handPenalty(before.racks[1]!, before.okey)
    const seat2 = handPenalty(before.racks[2]!, before.okey)
    expect(formatTiles(before.racks[1]!)).toContain('r5')
    expect(seat1).toBeGreaterThan(101)
    expect(done.result?.handScores).toEqual([
      -101,
      seat1 + before.penalties[1]!,
      seat2 * 2 + before.penalties[2]!,
      202 + before.penalties[3]!,
    ])
  })

  it('spares the winner partner and decides the match on team totals', () => {
    const state = game([`${FULL} k4 b13`], { teams: true, hands: 1 })
    let s = must(state, meld(state, 0, RUN13, B4, K3)).state
    s = must(s, layOff(s, 0, 'k4', 3)).state
    const done = must(s, discard(s, 0, 'b13'))
    expect(done.state.scores).toEqual([-101, 202, 0, 202])
    expect(sideTotals(done.state)).toEqual([-101, 404])
    expect(done.state.phase).toBe('matchOver')
    expect(done.state.winners).toEqual([0])
    expect(done.events.at(-1)).toMatchObject({ type: 'matchEnded', winners: [0] })
    expect(errorOf(done.state, { type: 'nextHand' })).toBe('MATCH_OVER')
    expect(errorOf(done.state, { type: 'pass', player: 1 })).toBe('MATCH_OVER')
    expect(getTimeoutAction(done.state)).toBeNull()
  })

  it('moves the deal on and keeps the totals for the next hand', () => {
    const state = game([`${FULL} k4 b13`])
    let s = must(state, meld(state, 0, RUN13, B4, K3)).state
    s = must(s, layOff(s, 0, 'k4', 3)).state
    s = must(s, discard(s, 0, 'b13')).state
    expect(errorOf(s, { type: 'draw', player: 1, from: 'pile' })).toBe('HAND_OVER')
    expect(getAllowedActions(s, 1).nextHand).toBe(true)
    const next = must(s, { type: 'nextHand' }).state
    expect(next).toMatchObject({ handNumber: 2, dealer: 0, turn: 1, scores: [-101, 202, 202, 202] })
    expect(next.racks[1]).toHaveLength(22)
    expect(next.table).toEqual([])
    expect(errorOf(next, { type: 'nextHand' })).toBe('HAND_IN_PROGRESS')
  })
})

describe('the rising barrier (katlamalı)', () => {
  const EXACT_101 = ['r11 r12 r13', 'k10 k11 k12', 'r8 y8 b8 k8']
  const setup = (options: Okey101Options) => {
    let state = game([`${RUN13} ${B4} b13`, EXACT_101.join(' ')], options)
    state = must(state, meld(state, 0, RUN13, B4)).state
    state = must(state, discard(state, 0, 'b13')).state
    return must(state, { type: 'draw', player: 1, from: 'pile' }).state
  }

  it('is off by default', () => {
    const state = setup({})
    expect(requiredOpening(state, 1)).toEqual({ points: 101, pairs: 5 })
    expect(must(state, meld(state, 1, ...EXACT_101)).state.openings).toHaveLength(2)
  })

  it('makes each opening beat the previous one', () => {
    const state = setup({ escalation: 'all' })
    expect(getAllowedActions(state, 1)).toMatchObject({ requiredPoints: 102, requiredPairs: 5 })
    expect(errorOf(state, meld(state, 1, ...EXACT_101))).toBe('OPENING_TOO_LOW')
  })

  it('binds only the other team in the opponents variant', () => {
    const state = setup({ escalation: 'opponents', teams: true })
    expect(requiredOpening(state, 1).points).toBe(102)
    expect(requiredOpening(state, 2).points).toBe(101)
  })

  it('raises the pair count the same way', () => {
    let state = game(['y1 y1 y2 y2 y3 y3 b4 b4 b6 b6'], { escalation: 'all' })
    state = must(state, meld(state, 0, 'y1 y1', 'y2 y2', 'y3 y3', 'b4 b4', 'b6 b6')).state
    expect(requiredOpening(state, 1)).toEqual({ points: 101, pairs: 6 })
  })
})

describe('an exhausted pile', () => {
  const drained = (options: Okey101Options = {}) => {
    let state = game(['r5'], options)
    while (!(state.drawPile.length === 0 && state.step === 'draw')) {
      state = must(state, getTimeoutAction(state)!).state
    }
    return state
  }

  it('scores the hand with no winner', () => {
    const state = drained()
    expect(errorOf(state, { type: 'draw', player: state.turn, from: 'pile' })).toBe('PILE_EMPTY')
    expect(getAllowedActions(state, state.turn)).toMatchObject({ pass: true, drawFromPile: false })
    const done = must(state, { type: 'pass', player: state.turn }).state
    expect(done.result).toMatchObject({ outcome: 'exhausted', winner: null, multiplier: 1 })
    expect(done.result?.handScores).toEqual([202, 202, 202, 202])
  })

  it('voids the hand instead when configured, charging only okeys in hand', () => {
    const state = drained({ pileExhausted: 'void' })
    const done = must(state, { type: 'pass', player: state.turn }).state
    expect(done.result?.outcome).toBe('void')
    const okeys = state.racks.map((rack) => rack.filter((t) => formatTiles([t]) === 'r5').length)
    expect(done.result?.handScores).toEqual(okeys.map((n) => n * 101))
    expect(okeys.reduce((a, b) => a + b)).toBeGreaterThan(0)
  })

  it('ends the hand when a taken discard is returned to an empty pile', () => {
    const state = drained()
    const took = must(state, { type: 'draw', player: state.turn, from: 'discard' }).state
    const done = must(took, { type: 'returnDiscard', player: took.turn })
    expect(done.state.phase).toBe('handOver')
    expect(done.events.map((e) => e.type)).toEqual(['discardReturned', 'handEnded'])
  })

  it('refuses a pass while tiles remain', () => {
    let state = game(['r5'])
    state = must(state, getTimeoutAction(state)!).state
    expect(errorOf(state, { type: 'pass', player: 1 })).toBe('PILE_NOT_EMPTY')
  })
})

describe('hidden information', () => {
  it('shows only the viewer rack and redacts pile draws', () => {
    let state = game(['r5'])
    const view = getPlayerView(state, 2)
    expect(view.rack).toEqual(state.racks[2])
    expect(view.rackSizes).toEqual([22, 21, 21, 21])
    expect(view.revealedRacks).toBeNull()
    expect(Object.keys(view)).not.toContain('racks')
    expect(Object.keys(view)).not.toContain('drawPile')
    state = must(state, getTimeoutAction(state)!).state
    const { events, state: after } = must(state, { type: 'draw', player: 1, from: 'pile' })
    expect(redactEvents(events, 0)[0]).toMatchObject({ tile: null })
    expect(redactEvents(events, 1)[0]).toMatchObject({ tile: after.drawn })
    expect(getPlayerView(after, 0).drawn).toBeNull()
  })

  it('reports unknown seats and actions', () => {
    const state = game(['r5'])
    expect(errorOf(state, { type: 'discard', player: 7, tile: 0 })).toBe('INVALID_PLAYER')
    expect(errorOf(state, { type: 'bogus', player: 0 } as unknown as Okey101Action)).toBe(
      'UNKNOWN_ACTION',
    )
    expect(errorOf(state, { type: 'discard', player: 0, tile: state.racks[1]![0]! })).toBe(
      'TILE_NOT_IN_RACK',
    )
    expect(getAllowedActions(state, 1)).toMatchObject({ discard: false, meld: false })
  })
})

/** A simple player: opens when it can, lays what it can, discards safely. */
function botTurn(state: Okey101State): Okey101Action {
  const player = state.turn
  const rack = state.racks[player]!
  if (state.step === 'draw') return getTimeoutAction(state)!
  const opened = state.openings.some((o) => o.player === player)
  if (!opened) {
    const best = findBestOpening(rack, state.okey, requiredOpening(state, player).points)
    if (best.opens && best.arrangement.leftover.length >= 1) {
      return { type: 'meld', player, melds: best.arrangement.melds.map((m) => m.tiles) }
    }
  } else if (rack.length >= 2) {
    const [layoff] = findLayoffs(rack, state.table, state.okey)
    if (layoff) return { type: 'layOff', player, ...layoff }
    const more = arrangeRuns(rack, state.okey, { objective: 'points', ...MELD_RULES })
    if (more.melds.length > 0 && more.leftover.length >= 1) {
      return { type: 'meld', player, melds: more.melds.map((m) => m.tiles) }
    }
  }
  return getTimeoutAction(state)!
}

describe('whole matches', () => {
  it('conserves tiles, survives JSON round trips and is deterministic', () => {
    fc.assert(
      fc.property(
        fc.record({
          seed: fc.integer(),
          players: fc.constantFrom(2 as const, 3 as const, 4 as const),
          escalation: fc.constantFrom('off' as const, 'all' as const),
        }),
        ({ seed, players, escalation }) => {
          const options: Okey101Options = { seed, players, escalation, hands: 2 }
          const log: Okey101Action[] = []
          let state = createGame(options)
          for (let step = 0; state.phase !== 'matchOver'; step++) {
            expect(step).toBeLessThan(3000)
            const action: Okey101Action =
              state.phase === 'handOver' ? { type: 'nextHand' } : botTurn(state)
            log.push(action)
            state = JSON.parse(JSON.stringify(must(state, action).state))
            const all = [
              state.indicator,
              ...state.racks.flat(),
              ...state.drawPile,
              ...state.discards.flat(),
              ...state.table.flatMap((m) => m.tiles),
            ]
            if (state.phase === 'playing')
              expect(all.sort((a, b) => a - b)).toEqual(createTileSet())
          }
          expect(state.winners?.length).toBeGreaterThan(0)
          expect(replay(options, log)).toEqual(state)
        },
      ),
      { numRuns: 40 },
    )
  }, 30_000)

  it('throws from replay when the log is illegal', () => {
    expect(() => replay({ seed: 1 }, [{ type: 'nextHand' }])).toThrow(/Replay failed at action 0/)
  })
})

describe('helpers', () => {
  it('suggest openings, lay-offs and safe discards', () => {
    const state = game([`${OPEN_105.join(' ')} r10 y5 r5`])
    const rack = state.racks[0]!
    expect(findBestOpening(rack, state.okey).opens).toBe(true)
    expect(findBestOpening(parseTiles('r1 r2 r3'), state.okey)).toMatchObject({
      value: 6,
      opens: false,
    })
    const opened = must(state, meld(state, 0, ...OPEN_105)).state
    expect(
      formatTiles([suggestDiscard(pick(opened, 0, 'r10 y5 r5'), opened.table, opened.okey)]),
    ).toBe('y5')
    expect(() => suggestDiscard([], [], state.okey)).toThrow(RangeError)
  })

  it('count pairs for a pairs opening', () => {
    const okey = { color: 'red', number: 5 } as const
    expect(findPairsOpening(parseTiles('y1 y1 y2 y2 y3 y3 b4 b4 b6 r5 k9'), okey)).toMatchObject({
      value: 5,
      opens: true,
    })
    expect(findPairsOpening(parseTiles('y1 y1 y2 y2 k9'), okey, 5)).toMatchObject({
      value: 2,
      opens: false,
    })
  })

  it('never use a 1 after 13', () => {
    const okey = { color: 'red', number: 5 } as const
    expect(findBestOpening(parseTiles('y12 y13 y1'), okey).value).toBe(0)
    expect(
      arrangeRuns(parseTiles('y12 y13 y1 r5'), okey, { objective: 'points', ...MELD_RULES }).points,
    ).toBe(36)
  })
})
