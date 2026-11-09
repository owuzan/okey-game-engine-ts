/**
 * Pieces shared by both game modes: seats, results, errors and dealing.
 */

import { type RngState, shuffle } from './rng'
import {
  createTileSet,
  isFalseJoker,
  type NumberFace,
  okeyFromIndicator,
  TILE_COUNT,
  type TileId,
} from './tiles'

/** A seat index, 0-based. Play passes from seat `n` to seat `n + 1`. */
export type Seat = number

export type ErrorCode =
  | 'MATCH_OVER'
  | 'HAND_OVER'
  | 'HAND_IN_PROGRESS'
  | 'INVALID_PLAYER'
  | 'NOT_YOUR_TURN'
  | 'WRONG_STEP'
  | 'TILE_NOT_IN_RACK'
  | 'PILE_EMPTY'
  | 'PILE_NOT_EMPTY'
  | 'NO_DISCARD'
  | 'NOT_A_WINNING_HAND'
  | 'INDICATOR_NOT_HELD'
  | 'INDICATOR_TOO_LATE'
  | 'INDICATOR_DISABLED'
  | 'INVALID_MELD'
  | 'DUPLICATE_TILE'
  | 'ALREADY_OPENED'
  | 'NOT_OPENED'
  | 'OPENING_TOO_LOW'
  | 'TOO_FEW_PAIRS'
  | 'MUST_KEEP_DISCARD'
  | 'MUST_USE_TAKEN_TILE'
  | 'INVALID_LAYOFF'
  | 'INVALID_SWAP'
  | 'UNKNOWN_MELD'
  | 'NOT_ALLOWED'
  | 'UNKNOWN_ACTION'

export interface RuleError {
  readonly code: ErrorCode
  readonly message: string
}

export type ApplyResult<State, Event> =
  | { readonly ok: true; readonly state: State; readonly events: readonly Event[] }
  | { readonly ok: false; readonly error: RuleError }

export function fail(code: ErrorCode, message: string): { ok: false; error: RuleError } {
  return { ok: false, error: { code, message } }
}

export interface Deal {
  readonly indicator: TileId
  readonly okey: NumberFace
  readonly racks: TileId[][]
  /** Next tile to draw is at index 0. */
  readonly drawPile: TileId[]
  readonly rng: RngState
}

/**
 * Checks a caller-supplied deck: a permutation of all 106 tiles whose first
 * tile (the indicator) is not a false joker.
 */
export function assertDeck(deck: readonly TileId[]): void {
  const sorted = deck.slice().sort((a, b) => a - b)
  if (deck.length !== TILE_COUNT || sorted.some((id, i) => id !== i)) {
    throw new RangeError('A deck must contain each of the 106 tiles exactly once')
  }
  if (isFalseJoker(deck[0] as TileId)) {
    throw new RangeError('The first tile of a deck is the indicator and cannot be a false joker')
  }
}

/**
 * Deals a hand. Deck order: indicator, then the starter's rack, then each
 * following seat's rack, then the draw pile in drawing order.
 */
export function deal(params: {
  readonly rng: RngState
  readonly players: number
  readonly handSize: number
  readonly starter: Seat
  readonly deck?: readonly TileId[]
}): Deal {
  let rng = params.rng
  let deck: TileId[]
  if (params.deck) {
    assertDeck(params.deck)
    deck = params.deck.slice()
  } else {
    ;[deck, rng] = shuffle(createTileSet(), rng)
    // The indicator is never a false joker: take the first numbered tile instead.
    const first = deck.findIndex((id) => !isFalseJoker(id))
    const [indicatorTile] = deck.splice(first, 1)
    deck.unshift(indicatorTile as TileId)
  }
  const indicator = deck[0] as TileId
  const racks: TileId[][] = Array.from({ length: params.players }, () => [])
  let cursor = 1
  for (let i = 0; i < params.players; i++) {
    const seat = (params.starter + i) % params.players
    const size = params.handSize + (i === 0 ? 1 : 0)
    racks[seat] = deck.slice(cursor, cursor + size)
    cursor += size
  }
  return { indicator, okey: okeyFromIndicator(indicator), racks, drawPile: deck.slice(cursor), rng }
}

/** Removes one tile from a rack, returning the new rack or `null` if absent. */
export function removeTile(rack: readonly TileId[], tile: TileId): TileId[] | null {
  const index = rack.indexOf(tile)
  if (index < 0) return null
  return [...rack.slice(0, index), ...rack.slice(index + 1)]
}

/** Removes several tiles from a rack, or returns `null` if any is absent or repeated. */
export function removeTiles(rack: readonly TileId[], tiles: readonly TileId[]): TileId[] | null {
  const remove = new Set(tiles)
  if (remove.size !== tiles.length) return null
  const rest = rack.filter((id) => !remove.has(id))
  return rest.length === rack.length - tiles.length ? rest : null
}

export function replaceAt<T>(items: readonly T[], index: number, value: T): T[] {
  const copy = items.slice()
  copy[index] = value
  return copy
}
