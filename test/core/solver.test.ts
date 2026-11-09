import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { layoutRack, sortByColor, sortByNumber } from '../../src/core/layout'
import { analyzeMeld } from '../../src/core/melds'
import { arrangePairs, arrangeRuns } from '../../src/core/solver'
import {
  COLORS,
  createTileSet,
  formatTiles,
  type NumberFace,
  parseFace,
  parseTiles,
  resolveTile,
  type TileId,
  tileFace,
} from '../../src/core/tiles'

const okey = parseFace('k9')
const show = (tiles: readonly TileId[]) => formatTiles(tiles)

describe('arrangeRuns (seri dizim)', () => {
  it('finds runs and groups and reports the rest', () => {
    const result = arrangeRuns(parseTiles('r1 r2 r3 y5 b5 k5 b11 y2'), okey)
    expect(result.melds.map((m) => show(m.tiles)).sort()).toEqual(['r1 r2 r3', 'y5 b5 k5'])
    expect(show(result.leftover)).toBe('b11 y2')
    expect(result.meldedCount).toBe(6)
  })

  it('resolves a tile contested between a run and a group', () => {
    // r5 can serve the run or the group, not both; the run is longer.
    const result = arrangeRuns(parseTiles('r3 r4 r5 r6 y5 b5'), okey)
    expect(result.meldedCount).toBe(4)
    const both = arrangeRuns(parseTiles('r3 r4 r5 r5 y5 b5'), okey)
    expect(both.meldedCount).toBe(6)
  })

  it('spends okeys where they complete the most', () => {
    const result = arrangeRuns(parseTiles('r1 r2 k9 y7 b7 k9 b12'), okey)
    expect(result.meldedCount).toBe(6)
    expect(show(result.leftover)).toBe('b12')
  })

  it('uses the high one', () => {
    expect(arrangeRuns(parseTiles('y12 y13 y1'), okey).meldedCount).toBe(3)
    expect(arrangeRuns(parseTiles('y13 y1 y2'), okey).meldedCount).toBe(0)
  })

  it('maximises points when asked', () => {
    // The okey either closes a long low run or a short high one.
    const hand = parseTiles('r1 r2 r4 b12 b13 k9')
    expect(arrangeRuns(hand, okey, { objective: 'tiles' }).meldedCount).toBe(4)
    const byPoints = arrangeRuns(hand, okey, { objective: 'points' })
    expect(byPoints.points).toBe(36)
    expect(byPoints.meldedCount).toBe(3)
  })

  it('returns an empty arrangement for an empty hand', () => {
    expect(arrangeRuns([], okey)).toMatchObject({ melds: [], leftover: [], meldedCount: 0 })
  })
})

describe('arrangePairs (çift dizim)', () => {
  it('pairs identical tiles and gives okeys to the highest singles', () => {
    const result = arrangePairs(parseTiles('r1 r1 y5 y5 k9 b3 b13 jk jk'), okey)
    expect(result.melds.map((m) => show(m.tiles))).toEqual(['r1 r1', 'y5 y5', 'jk jk', 'b13 k9'])
    expect(show(result.leftover)).toBe('b3')
  })

  it('pairs two spare okeys together', () => {
    const result = arrangePairs(parseTiles('k9 k9 r4 r4'), okey)
    expect(result.melds).toHaveLength(2)
    expect(result.leftover).toHaveLength(0)
  })

  it('leaves a lone okey unpaired when nothing is left', () => {
    expect(show(arrangePairs(parseTiles('k9 r4 r4'), okey).leftover)).toBe('k9')
  })
})

// --- independent brute force -------------------------------------------------

const ALL_FACES: NumberFace[] = COLORS.flatMap((color) =>
  Array.from({ length: 13 }, (_, i) => ({ color, number: i + 1 })),
)

function fixedMeldPoints(faces: NumberFace[]): number {
  if (faces.length < 3) return -1
  const sum = faces.reduce((s, f) => s + f.number, 0)
  const sameNumber = faces.every((f) => f.number === faces[0]!.number)
  if (sameNumber && faces.length <= 4 && new Set(faces.map((f) => f.color)).size === faces.length) {
    return sum
  }
  if (faces.some((f) => f.color !== faces[0]!.color)) return -1
  for (const high of [false, true]) {
    const positions = faces
      .map((f) => (f.number === 1 && high ? 14 : f.number))
      .sort((a, b) => a - b)
    if (positions.every((p, i) => i === 0 || p === positions[i - 1]! + 1)) return sum
  }
  return -1
}

/** Best points a subset can score as a single meld, trying every okey assignment. */
function bestMeldPoints(tiles: TileId[], okeyFace: NumberFace): number {
  const fixed: NumberFace[] = []
  let wilds = 0
  for (const id of tiles) {
    const r = resolveTile(id, okeyFace)
    if (r.wild) wilds++
    else fixed.push({ color: r.color, number: r.number })
  }
  if (fixed.length === 0) return -1
  if (wilds === 0) return fixedMeldPoints(fixed)
  let best = -1
  for (const a of ALL_FACES) {
    if (wilds === 1) best = Math.max(best, fixedMeldPoints([...fixed, a]))
    else for (const b of ALL_FACES) best = Math.max(best, fixedMeldPoints([...fixed, a, b]))
  }
  return best
}

function bruteForce(tiles: TileId[], okeyFace: NumberFace) {
  const n = tiles.length
  const melds: { mask: number; size: number; points: number }[] = []
  for (let mask = 1; mask < 1 << n; mask++) {
    const subset = tiles.filter((_, i) => mask & (1 << i))
    if (subset.length < 3) continue
    const points = bestMeldPoints(subset, okeyFace)
    if (points >= 0) melds.push({ mask, size: subset.length, points })
  }
  let bestTiles = 0
  let bestPoints = 0
  const visit = (from: number, used: number, count: number, points: number) => {
    bestTiles = Math.max(bestTiles, count)
    bestPoints = Math.max(bestPoints, points)
    for (let i = from; i < melds.length; i++) {
      const m = melds[i]!
      if ((m.mask & used) === 0) visit(i + 1, used | m.mask, count + m.size, points + m.points)
    }
  }
  visit(0, 0, 0, 0)
  return { bestTiles, bestPoints }
}

// A dense slice of the tile set so that random hands actually contain melds.
const DENSE = createTileSet().filter((id) => {
  const face = tileFace(id)
  return face.kind === 'falseJoker' || [1, 2, 3, 4, 12, 13].includes(face.number)
})

describe('solver properties', () => {
  const hands = fc.record({
    tiles: fc.shuffledSubarray(DENSE, { minLength: 0, maxLength: 9 }),
    okey: fc.constantFrom(...ALL_FACES.filter((f) => [1, 2, 13].includes(f.number))),
  })

  it('matches brute force on tile count and on points', () => {
    fc.assert(
      fc.property(hands, ({ tiles, okey: okeyFace }) => {
        const expected = bruteForce(tiles, okeyFace)
        expect(arrangeRuns(tiles, okeyFace).meldedCount).toBe(expected.bestTiles)
        expect(arrangeRuns(tiles, okeyFace, { objective: 'points' }).points).toBe(
          expected.bestPoints,
        )
      }),
      { numRuns: 300 },
    )
  })

  it('returns only valid melds and conserves the hand', () => {
    const full = fc.record({
      tiles: fc.shuffledSubarray(createTileSet(), { minLength: 0, maxLength: 22 }),
      okey: fc.constantFrom(...ALL_FACES),
      objective: fc.constantFrom('tiles' as const, 'points' as const),
    })
    fc.assert(
      fc.property(full, ({ tiles, okey: okeyFace, objective }) => {
        for (const result of [
          arrangeRuns(tiles, okeyFace, { objective }),
          arrangePairs(tiles, okeyFace),
        ]) {
          const seen = [...result.melds.flatMap((m) => m.tiles), ...result.leftover]
          expect(seen.slice().sort((a, b) => a - b)).toEqual(tiles.slice().sort((a, b) => a - b))
          for (const m of result.melds) {
            const checked = analyzeMeld(m.tiles, okeyFace, { as: m.kind })
            expect(checked).not.toBeNull()
            expect(checked?.points).toBe(m.points)
          }
        }
      }),
      { numRuns: 300 },
    )
  })
})

describe('rack layout', () => {
  it('sorts by colour and by number, okeys last', () => {
    const hand = parseTiles('k9 b2 r5 y2 r1 jk')
    expect(show(sortByColor(hand, okey))).toBe('r1 r5 y2 b2 jk k9')
    expect(show(sortByNumber(hand, okey))).toBe('r1 y2 b2 r5 jk k9')
    expect(show(sortByColor(hand))).toBe('r1 r5 y2 b2 k9 jk')
  })

  it('lays melds out in blocks across two rows with gaps', () => {
    const arrangement = arrangeRuns(parseTiles('r1 r2 r3 y5 b5 k5 b7 b8 b9 b10 y1 k3'), okey)
    const layout = layoutRack(arrangement, { columns: 8 })
    expect(layout).toHaveLength(2)
    expect(layout.every((row) => row.length === 8)).toBe(true)
    expect(layout.flat().filter((slot) => slot !== null)).toHaveLength(12)
    const firstRow = layout[0]!.map((slot) => (slot === null ? '_' : formatTiles([slot]))).join(' ')
    expect(firstRow).toBe('r1 r2 r3 _ y5 b5 k5 _')
  })

  it('drops the gaps when the rack is tight and rejects overflow', () => {
    const blocks = [parseTiles('r1 r2 r3'), parseTiles('y1 y2 y3')]
    expect(layoutRack(blocks, { rows: 1, columns: 6 })[0]).toEqual([...blocks[0]!, ...blocks[1]!])
    expect(() => layoutRack(blocks, { rows: 1, columns: 5 })).toThrow(RangeError)
  })
})
