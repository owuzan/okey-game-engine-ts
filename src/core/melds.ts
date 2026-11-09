/**
 * Melds (per): runs (seri), groups (grup) and pairs (çift).
 *
 * Runs are laid out on positions 1..14 where position 14 is a "high one"
 * (the 1 that follows 13). A run lives entirely in 1..13 or in 2..14, so
 * 12-13-1 is valid and 13-1-2 is not.
 */

import { COLORS, type Color, type NumberFace, resolveTile, type TileId } from './tiles'

export type MeldKind = 'run' | 'group' | 'pair'

export interface Meld {
  readonly kind: MeldKind
  /** Tiles in display order (runs ascending). */
  readonly tiles: readonly TileId[]
  /** The face each tile stands for, parallel to `tiles`; for an okey, the tile it replaces. */
  readonly faces: readonly NumberFace[]
  /** Sum of the faces' numbers. */
  readonly points: number
}

export interface MeldRules {
  /**
   * Whether a 1 may follow 13 in a run (12-13-1). True in classic Okey,
   * false in Okey 101. Default true.
   */
  readonly highOne?: boolean
}

export interface AnalyzeOptions extends MeldRules {
  /** Force an interpretation when tiles could be read as either a run or a group. */
  readonly as?: MeldKind
}

interface Resolved {
  readonly id: TileId
  readonly wild: boolean
  readonly color: Color
  readonly number: number
}

function resolveAll(tiles: readonly TileId[], okey: NumberFace): Resolved[] {
  return tiles.map((id) => {
    const r = resolveTile(id, okey)
    return r.wild
      ? { id, wild: true, color: okey.color, number: okey.number }
      : { id, wild: false, color: r.color, number: r.number }
  })
}

function sumPoints(faces: readonly NumberFace[]): number {
  let total = 0
  for (const face of faces) total += face.number
  return total
}

function positionFace(color: Color, position: number): NumberFace {
  return { color, number: position === 14 ? 1 : position }
}

function buildRun(ordered: readonly Resolved[], color: Color, start: number): Meld {
  const faces = ordered.map((_, i) => positionFace(color, start + i))
  return { kind: 'run', tiles: ordered.map((t) => t.id), faces, points: sumPoints(faces) }
}

/** Reads the tiles as a run exactly in the order given (ascending). */
function runInOrder(tiles: readonly Resolved[], top: number): Meld | null {
  const anchorIndex = tiles.findIndex((t) => !t.wild)
  const anchor = tiles[anchorIndex]
  if (!anchor) return null
  const anchorPositions = anchor.number === 1 && top === 14 ? [1, 14] : [anchor.number]
  let best: Meld | null = null
  for (const anchorPosition of anchorPositions) {
    const start = anchorPosition - anchorIndex
    const end = start + tiles.length - 1
    if (start < 1 || end > top || tiles.length > 13) continue
    const fits = tiles.every((t, i) => {
      if (t.wild) return true
      const position = start + i
      return t.color === anchor.color && t.number === (position === 14 ? 1 : position)
    })
    if (!fits) continue
    const meld = buildRun(tiles, anchor.color, start)
    if (!best || meld.points > best.points) best = meld
  }
  return best
}

/**
 * Reads the tiles as a run regardless of order: okeys fill the gaps, then
 * extend upwards to 13, then downwards, then onto the high one.
 */
function runCanonical(tiles: readonly Resolved[], top: number): Meld | null {
  const reals = tiles.filter((t) => !t.wild)
  const wilds = tiles.filter((t) => t.wild)
  const first = reals[0]
  if (!first || tiles.length > 13) return null
  if (reals.some((t) => t.color !== first.color)) return null
  const one = reals.find((t) => t.number === 1)
  let best: Meld | null = null
  for (const onePosition of one ? (top === 14 ? [1, 14] : [1]) : [0]) {
    const byPosition = new Map<number, Resolved>()
    let duplicate = false
    for (const t of reals) {
      const position = t.number === 1 ? onePosition : t.number
      if (byPosition.has(position)) duplicate = true
      byPosition.set(position, t)
    }
    if (duplicate) continue
    let low = Math.min(...byPosition.keys())
    let high = Math.max(...byPosition.keys())
    let spare = wilds.length - (high - low + 1 - reals.length)
    if (spare < 0) continue
    const floor = high === 14 ? 2 : 1
    while (spare > 0 && high < 13) {
      high++
      spare--
    }
    while (spare > 0 && low > floor) {
      low--
      spare--
    }
    if (spare > 0 && top === 14 && high === 13 && low >= 2) {
      high = 14
      spare--
    }
    if (spare > 0) continue
    const pool = wilds.slice()
    const ordered: Resolved[] = []
    for (let position = low; position <= high; position++) {
      ordered.push(byPosition.get(position) ?? (pool.pop() as Resolved))
    }
    const meld = buildRun(ordered, first.color, low)
    if (!best || meld.points > best.points) best = meld
  }
  return best
}

function analyzeRun(tiles: readonly Resolved[], top: number): Meld | null {
  if (tiles.length < 3) return null
  return (
    runInOrder(tiles, top) ?? runInOrder(tiles.slice().reverse(), top) ?? runCanonical(tiles, top)
  )
}

function analyzeGroup(tiles: readonly Resolved[]): Meld | null {
  if (tiles.length < 3 || tiles.length > 4) return null
  const reals = tiles.filter((t) => !t.wild)
  const first = reals[0]
  if (!first) return null
  const used = new Set<Color>()
  for (const t of reals) {
    if (t.number !== first.number || used.has(t.color)) return null
    used.add(t.color)
  }
  const missing = COLORS.filter((c) => !used.has(c))
  const faces = tiles.map((t) =>
    t.wild
      ? { color: missing.shift() as Color, number: first.number }
      : { color: t.color, number: t.number },
  )
  return { kind: 'group', tiles: tiles.map((t) => t.id), faces, points: sumPoints(faces) }
}

function analyzePair(tiles: readonly Resolved[]): Meld | null {
  const [a, b] = tiles
  if (tiles.length !== 2 || !a || !b) return null
  const model = !a.wild ? a : b
  if (!a.wild && !b.wild && (a.color !== b.color || a.number !== b.number)) return null
  const face = { color: model.color, number: model.number }
  return { kind: 'pair', tiles: [a.id, b.id], faces: [face, face], points: face.number * 2 }
}

/**
 * Validates a set of tiles as one meld and works out what each okey stands
 * for. Returns `null` when the tiles do not form a meld.
 *
 * Two tiles are read as a pair. Three or more are read as a run in the given
 * order, then as a group, then as a run in any order; pass `as` to force one.
 */
export function analyzeMeld(
  tiles: readonly TileId[],
  okey: NumberFace,
  options: AnalyzeOptions = {},
): Meld | null {
  if (new Set(tiles).size !== tiles.length) return null
  const resolved = resolveAll(tiles, okey)
  const top = options.highOne === false ? 13 : 14
  switch (options.as) {
    case 'pair':
      return analyzePair(resolved)
    case 'run':
      return analyzeRun(resolved, top)
    case 'group':
      return analyzeGroup(resolved)
    default:
      if (tiles.length === 2) return analyzePair(resolved)
      return (
        (tiles.length >= 3 ? runInOrder(resolved, top) : null) ??
        (tiles.length >= 3 ? runInOrder(resolved.slice().reverse(), top) : null) ??
        analyzeGroup(resolved) ??
        (tiles.length >= 3 ? runCanonical(resolved, top) : null)
      )
  }
}

/**
 * Adds one tile to an existing run or group without disturbing what its
 * okeys already stand for (işleme). Returns the extended meld or `null`.
 */
export function extendMeld(
  meld: Meld,
  tile: TileId,
  okey: NumberFace,
  rules: MeldRules = {},
): Meld | null {
  if (meld.tiles.includes(tile)) return null
  const added = resolveTile(tile, okey)
  if (meld.kind === 'group') {
    return analyzeMeld([...meld.tiles, tile], okey, { as: 'group' })
  }
  if (meld.kind !== 'run') return null
  const firstFace = meld.faces[0] as NumberFace
  const lastFace = meld.faces[meld.faces.length - 1] as NumberFace
  const start = firstFace.number
  const end = lastFace.number === 1 ? 14 : lastFace.number
  const color = firstFace.color
  if (meld.tiles.length >= 13) return null
  const fits = (position: number) =>
    added.wild || (added.color === color && added.number === (position === 14 ? 1 : position))
  const make = (tiles: TileId[], newStart: number): Meld => {
    const faces = tiles.map((_, i) => positionFace(color, newStart + i))
    return { kind: 'run', tiles, faces, points: sumPoints(faces) }
  }
  // Prefer the top end for an okey so it scores as much as possible.
  if (end < 13 && fits(end + 1)) return make([...meld.tiles, tile], start)
  if (start > 1 && fits(start - 1)) return make([tile, ...meld.tiles], start - 1)
  if (rules.highOne !== false && end === 13 && start >= 2 && fits(14))
    return make([...meld.tiles, tile], start)
  return null
}

/** The okeys in a meld together with the face each one stands for. */
export function meldOkeys(meld: Meld, okey: NumberFace): { tile: TileId; face: NumberFace }[] {
  const result: { tile: TileId; face: NumberFace }[] = []
  meld.tiles.forEach((tile, i) => {
    if (resolveTile(tile, okey).wild) result.push({ tile, face: meld.faces[i] as NumberFace })
  })
  return result
}
