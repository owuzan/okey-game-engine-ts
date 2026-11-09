/**
 * Okey 101 helpers that work on bare tiles and the public table, so a client
 * can run them on its own rack.
 */

import { extendMeld, type Meld, type MeldRules } from '../core/melds'
import { type Arrangement, arrangePairs, arrangeRuns } from '../core/solver'
import { type NumberFace, resolveTile, type TileId } from '../core/tiles'
import type { TableMeld } from './types'

/** In Okey 101 a 1 never follows 13. */
export const MELD_RULES: MeldRules = { highOne: false }

/** What a tile left in the hand counts: its number, or `okeyPoints` for an okey. */
export function tilePoints(tile: TileId, okey: NumberFace, okeyPoints = 101): number {
  const r = resolveTile(tile, okey)
  return r.wild ? okeyPoints : r.number
}

/** The sum an opened player is charged for the tiles left in hand. */
export function handPenalty(tiles: readonly TileId[], okey: NumberFace, okeyPoints = 101): number {
  return tiles.reduce((sum, tile) => sum + tilePoints(tile, okey, okeyPoints), 0)
}

export interface OpeningSuggestion {
  readonly arrangement: Arrangement
  /** Points for runs and groups; number of pairs for a pairs opening. */
  readonly value: number
  /** Whether `value` reaches what is required. */
  readonly opens: boolean
}

/** The highest-scoring set of runs and groups in the hand, and whether it opens. */
export function findBestOpening(
  tiles: readonly TileId[],
  okey: NumberFace,
  requiredPoints = 101,
): OpeningSuggestion {
  const arrangement = arrangeRuns(tiles, okey, { objective: 'points', ...MELD_RULES })
  return { arrangement, value: arrangement.points, opens: arrangement.points >= requiredPoints }
}

/** The most pairs the hand holds, and whether that opens. */
export function findPairsOpening(
  tiles: readonly TileId[],
  okey: NumberFace,
  requiredPairs = 5,
): OpeningSuggestion {
  const arrangement = arrangePairs(tiles, okey)
  const value = arrangement.melds.length
  return { arrangement, value, opens: value >= requiredPairs }
}

export interface Layoff {
  readonly tile: TileId
  /** Id of the table meld the tile fits. */
  readonly meld: number
}

/** True when the tile can extend some run or group on the table (işlek taş). */
export function isLayable(tile: TileId, table: readonly TableMeld[], okey: NumberFace): boolean {
  return table.some((meld) => meld.kind !== 'pair' && extendMeld(meld, tile, okey, MELD_RULES))
}

/** Every tile in the hand that fits a table meld, with each meld it fits. */
export function findLayoffs(
  tiles: readonly TileId[],
  table: readonly TableMeld[],
  okey: NumberFace,
): Layoff[] {
  const result: Layoff[] = []
  for (const tile of tiles) {
    for (const meld of table) {
      if (meld.kind !== 'pair' && extendMeld(meld, tile, okey, MELD_RULES)) {
        result.push({ tile, meld: meld.id })
      }
    }
  }
  return result
}

/**
 * Where `tile` could replace an okey in `meld`: the okey's index, or -1.
 * Only runs and four-tile groups qualify, because only there is it certain
 * which tile the okey stands for.
 */
export function okeySwapIndex(meld: Meld, tile: TileId, okey: NumberFace): number {
  if (meld.kind === 'pair' || (meld.kind === 'group' && meld.tiles.length < 4)) return -1
  const r = resolveTile(tile, okey)
  if (r.wild) return -1
  return meld.tiles.findIndex((id, i) => {
    const face = meld.faces[i] as NumberFace
    return resolveTile(id, okey).wild && face.color === r.color && face.number === r.number
  })
}

export interface OkeySwap {
  readonly tile: TileId
  readonly meld: number
  /** The okey that would be picked up. */
  readonly okey: TileId
}

/** Every okey on the table that a tile in the hand can replace. */
export function findOkeySwaps(
  tiles: readonly TileId[],
  table: readonly TableMeld[],
  okey: NumberFace,
): OkeySwap[] {
  const result: OkeySwap[] = []
  for (const tile of tiles) {
    for (const meld of table) {
      const index = okeySwapIndex(meld, tile, okey)
      if (index >= 0) result.push({ tile, meld: meld.id, okey: meld.tiles[index] as TileId })
    }
  }
  return result
}

/**
 * A tile to throw away that avoids penalties where possible: not an okey,
 * not a tile that fits the table, and as high as possible.
 */
export function suggestDiscard(
  tiles: readonly TileId[],
  table: readonly TableMeld[],
  okey: NumberFace,
): TileId {
  if (tiles.length === 0) throw new RangeError('Cannot suggest a discard from an empty rack')
  const cost = (tile: TileId) => {
    const r = resolveTile(tile, okey)
    if (r.wild) return 2000
    return (isLayable(tile, table, okey) ? 1000 : 0) - r.number
  }
  return tiles.reduce((best, tile) => (cost(tile) < cost(best) ? tile : best))
}
