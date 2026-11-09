/**
 * Classic Okey helpers that work on a bare list of tiles, so a client can
 * run them on its own rack.
 */

import { type Arrangement, arrangePairs, arrangeRuns } from '../core/solver'
import { isOkey, type NumberFace, resolveTile, type TileId } from '../core/tiles'

export interface WinningHand {
  readonly kind: 'runs' | 'pairs'
  readonly arrangement: Arrangement
}

export interface WinCheckOptions {
  /** Whether seven pairs counts as a winning hand. Default true. */
  readonly allowPairs?: boolean
}

/**
 * Checks whether fourteen tiles form a winning hand: all in runs and groups,
 * or seven pairs. Pairs win when both readings are possible (they score more).
 */
export function checkWinningHand(
  tiles: readonly TileId[],
  okey: NumberFace,
  options: WinCheckOptions = {},
): WinningHand | null {
  if (tiles.length !== 14) return null
  if (options.allowPairs !== false) {
    const pairs = arrangePairs(tiles, okey)
    if (pairs.meldedCount === 14) return { kind: 'pairs', arrangement: pairs }
  }
  const runs = arrangeRuns(tiles, okey)
  return runs.meldedCount === 14 ? { kind: 'runs', arrangement: runs } : null
}

export interface WinningDiscard {
  /** The tile to discard. */
  readonly tile: TileId
  readonly hand: WinningHand
  /** True when the discard is an okey (okey atarak bitme). */
  readonly okeyDiscard: boolean
}

/**
 * From fifteen tiles, lists every discard that leaves a winning hand, best
 * first (okey discards and pairs score more). Identical faces are listed once.
 */
export function findWinningDiscards(
  tiles: readonly TileId[],
  okey: NumberFace,
  options: WinCheckOptions = {},
): WinningDiscard[] {
  if (tiles.length !== 15) return []
  // Cheap rejection: a win leaves at most one tile outside the melds of all fifteen.
  const pairsPossible = options.allowPairs !== false && arrangePairs(tiles, okey).meldedCount >= 14
  if (!pairsPossible && arrangeRuns(tiles, okey).meldedCount < 14) return []
  const seen = new Set<string>()
  const result: WinningDiscard[] = []
  for (const tile of tiles) {
    const r = resolveTile(tile, okey)
    const key = r.wild ? 'wild' : `${r.color}${r.number}`
    if (seen.has(key)) continue
    seen.add(key)
    const hand = checkWinningHand(
      tiles.filter((id) => id !== tile),
      okey,
      options,
    )
    if (hand) result.push({ tile, hand, okeyDiscard: r.wild })
  }
  const rank = (d: WinningDiscard) => (d.okeyDiscard ? 2 : 0) + (d.hand.kind === 'pairs' ? 1 : 0)
  return result.sort((a, b) => rank(b) - rank(a))
}

/** True when every tile is one colour; okeys match any colour. */
export function isSingleColor(tiles: readonly TileId[], okey: NumberFace): boolean {
  let color: string | null = null
  for (const id of tiles) {
    const r = resolveTile(id, okey)
    if (r.wild) continue
    if (color !== null && r.color !== color) return false
    color = r.color
  }
  return true
}

/**
 * A reasonable tile to throw away: the highest tile that the best
 * arrangement leaves unused, and never an okey if anything else is available.
 */
export function suggestDiscard(tiles: readonly TileId[], okey: NumberFace): TileId {
  if (tiles.length === 0) throw new RangeError('Cannot suggest a discard from an empty rack')
  const value = (id: TileId) => {
    const r = resolveTile(id, okey)
    return r.wild ? -1 : r.number
  }
  const pick = (candidates: readonly TileId[]) =>
    candidates.reduce((best, id) => (value(id) > value(best) ? id : best))
  const leftover = arrangeRuns(tiles, okey).leftover.filter((id) => !isOkey(id, okey))
  if (leftover.length > 0) return pick(leftover)
  return pick(tiles)
}
