/**
 * Exact rack solvers: the best split of a hand into runs and groups
 * (seri dizim) and into pairs (çift dizim).
 */

import type { Meld, MeldRules } from './melds'
import { COLORS, type Color, type NumberFace, resolveTile, type TileId } from './tiles'

export interface Arrangement {
  readonly melds: readonly Meld[]
  /** Tiles not used in any meld, in their original order. */
  readonly leftover: readonly TileId[]
  /** Number of tiles placed in melds. */
  readonly meldedCount: number
  /** Total points of the melds. */
  readonly points: number
}

export interface ArrangeOptions extends MeldRules {
  /**
   * What to maximise: the number of tiles in melds (classic Okey) or the
   * melds' total points (Okey 101). The other measure breaks ties.
   */
  readonly objective?: 'tiles' | 'points'
}

type Choice =
  | { readonly type: 'skip'; readonly index: number }
  | { readonly type: 'run'; readonly color: number; readonly start: number; readonly end: number }
  | { readonly type: 'group'; readonly number: number; readonly colors: readonly number[] }

interface Entry {
  readonly score: number
  readonly choice: Choice | null
}

const numberAt = (position: number) => (position === 14 ? 1 : position)
const indexOf = (color: number, number: number) => color * 13 + number - 1
const bump = (counts: Uint8Array, index: number, by: number) => {
  counts[index] = (counts[index] as number) + by
}

/** The three ways to pick two of three colours, plus all three. */
const GROUP_PARTNERS: readonly (readonly number[])[] = [
  [0, 1],
  [0, 2],
  [1, 2],
  [0, 1, 2],
]

class Search {
  private readonly memo = new Map<string, Entry>()

  constructor(
    private readonly counts: Uint8Array,
    private wilds: number,
    private readonly tileWeight: number,
    private readonly pointWeight: number,
    private readonly top: number,
  ) {}

  private key(): string {
    return `${String.fromCharCode(...this.counts)}${this.wilds}`
  }

  solve(): Entry {
    const first = this.counts.findIndex((c) => c > 0)
    if (first < 0) return { score: 0, choice: null }
    const key = this.key()
    const cached = this.memo.get(key)
    if (cached) return cached

    const counts = this.counts
    const color = Math.floor(first / 13)
    const number = (first % 13) + 1

    // Leave this tile out of every meld.
    bump(counts, first, -1)
    let bestScore = this.solve().score
    let bestChoice: Choice = { type: 'skip', index: first }
    bump(counts, first, 1)

    // Runs through this tile. It may sit at its own position or, for a 1, at 14.
    for (const position of number === 1 && this.top === 14 ? [1, 14] : [number]) {
      for (let start = Math.max(1, position - 12); start <= position; start++) {
        let needed = 0
        let points = 0
        for (let p = start; p < position; p++) {
          if ((counts[indexOf(color, numberAt(p))] as number) === 0) needed++
          points += numberAt(p)
        }
        points += numberAt(position)
        if (needed > this.wilds) continue
        for (let end = position; end <= Math.min(this.top, start + 12); end++) {
          if (end === 14 && start < 2) break
          if (end > position) {
            if ((counts[indexOf(color, numberAt(end))] as number) === 0) needed++
            points += numberAt(end)
          }
          if (needed > this.wilds) break
          const length = end - start + 1
          if (length < 3) continue
          const used = needed
          const real: number[] = []
          for (let p = start; p <= end; p++) {
            const i = indexOf(color, numberAt(p))
            if ((counts[i] as number) > 0) real.push(i)
          }
          for (const i of real) bump(counts, i, -1)
          this.wilds -= used
          const score = length * this.tileWeight + points * this.pointWeight + this.solve().score
          this.wilds += used
          for (const i of real) bump(counts, i, 1)
          if (score > bestScore) {
            bestScore = score
            bestChoice = { type: 'run', color, start, end }
          }
        }
      }
    }

    // Groups containing this tile.
    const others = [0, 1, 2, 3].filter((c) => c !== color)
    for (const pick of GROUP_PARTNERS) {
      const partners = pick.map((i) => others[i] as number)
      const real = partners.filter((c) => (counts[indexOf(c, number)] as number) > 0)
      const needed = partners.length - real.length
      if (needed > this.wilds) continue
      bump(counts, first, -1)
      for (const c of real) bump(counts, indexOf(c, number), -1)
      this.wilds -= needed
      const size = partners.length + 1
      const score = size * this.tileWeight + size * number * this.pointWeight + this.solve().score
      this.wilds += needed
      for (const c of real) bump(counts, indexOf(c, number), 1)
      bump(counts, first, 1)
      if (score > bestScore) {
        bestScore = score
        bestChoice = { type: 'group', number, colors: [color, ...partners] }
      }
    }

    const entry = { score: bestScore, choice: bestChoice }
    this.memo.set(key, entry)
    return entry
  }

  /** Replays the best choices, calling back for every meld. */
  walk(
    onMeld: (
      slots: { color: number; number: number; real: boolean }[],
      kind: 'run' | 'group',
    ) => void,
  ): void {
    for (;;) {
      const { choice } = this.solve()
      if (!choice) return
      const counts = this.counts
      if (choice.type === 'skip') {
        bump(counts, choice.index, -1)
        continue
      }
      const cells =
        choice.type === 'run'
          ? Array.from({ length: choice.end - choice.start + 1 }, (_, i) => ({
              color: choice.color,
              number: numberAt(choice.start + i),
            }))
          : choice.colors.map((color) => ({ color, number: choice.number }))
      const slots = cells.map((cell) => {
        const i = indexOf(cell.color, cell.number)
        const real = (counts[i] as number) > 0
        if (real) bump(counts, i, -1)
        else this.wilds--
        return { ...cell, real }
      })
      onMeld(slots, choice.type)
    }
  }
}

/**
 * Splits a hand into runs and groups, optimally (seri dizim). Okeys are
 * placed wherever they help most; false jokers act as the okey's face.
 */
export function arrangeRuns(
  tiles: readonly TileId[],
  okey: NumberFace,
  options: ArrangeOptions = {},
): Arrangement {
  const byPoints = options.objective === 'points'
  const counts = new Uint8Array(52)
  const pools = new Map<number, TileId[]>()
  const wildIds: TileId[] = []
  for (const id of tiles) {
    const r = resolveTile(id, okey)
    if (r.wild) {
      wildIds.push(id)
      continue
    }
    const i = indexOf(COLORS.indexOf(r.color), r.number)
    bump(counts, i, 1)
    const pool = pools.get(i)
    if (pool) pool.push(id)
    else pools.set(i, [id])
  }

  // Primary measure outweighs any possible total of the secondary one.
  const search = new Search(
    counts,
    wildIds.length,
    byPoints ? 1 : 1000,
    byPoints ? 100 : 1,
    options.highOne === false ? 13 : 14,
  )
  search.solve()

  const melds: Meld[] = []
  const used = new Set<TileId>()
  search.walk((slots, kind) => {
    const meldTiles: TileId[] = []
    const faces: NumberFace[] = []
    let points = 0
    for (const slot of slots) {
      const id = slot.real
        ? (pools.get(indexOf(slot.color, slot.number)) as TileId[]).shift()
        : wildIds.shift()
      meldTiles.push(id as TileId)
      used.add(id as TileId)
      faces.push({ color: COLORS[slot.color] as Color, number: slot.number })
      points += slot.number
    }
    melds.push({ kind, tiles: meldTiles, faces, points })
  })

  const leftover = tiles.filter((id) => !used.has(id))
  return {
    melds,
    leftover,
    meldedCount: tiles.length - leftover.length,
    points: melds.reduce((sum, m) => sum + m.points, 0),
  }
}

/**
 * Splits a hand into as many pairs as possible (çift dizim). Each okey is
 * paired with the highest unpaired tile; two spare okeys pair with each other.
 */
export function arrangePairs(tiles: readonly TileId[], okey: NumberFace): Arrangement {
  const byFace = new Map<number, TileId[]>()
  const wildIds: TileId[] = []
  for (const id of tiles) {
    const r = resolveTile(id, okey)
    if (r.wild) {
      wildIds.push(id)
      continue
    }
    const i = indexOf(COLORS.indexOf(r.color), r.number)
    const pool = byFace.get(i)
    if (pool) pool.push(id)
    else byFace.set(i, [id])
  }

  const melds: Meld[] = []
  const singles: { id: TileId; face: NumberFace }[] = []
  const pair = (a: TileId, b: TileId, face: NumberFace) =>
    melds.push({ kind: 'pair', tiles: [a, b], faces: [face, face], points: face.number * 2 })

  for (const [i, ids] of [...byFace].sort((a, b) => a[0] - b[0])) {
    const face = { color: COLORS[Math.floor(i / 13)] as Color, number: (i % 13) + 1 }
    while (ids.length >= 2) pair(ids.shift() as TileId, ids.shift() as TileId, face)
    const last = ids[0]
    if (last !== undefined) singles.push({ id: last, face })
  }

  singles.sort((a, b) => b.face.number - a.face.number)
  while (wildIds.length > 0 && singles.length > 0) {
    const single = singles.shift() as { id: TileId; face: NumberFace }
    pair(single.id, wildIds.shift() as TileId, single.face)
  }
  if (wildIds.length >= 2) pair(wildIds.shift() as TileId, wildIds.shift() as TileId, okey)

  const used = new Set(melds.flatMap((m) => m.tiles))
  const leftover = tiles.filter((id) => !used.has(id))
  return {
    melds,
    leftover,
    meldedCount: tiles.length - leftover.length,
    points: melds.reduce((sum, m) => sum + m.points, 0),
  }
}
