import { describe, expect, it } from 'vitest'
import {
  checkWinningHand,
  findWinningDiscards,
  isSingleColor,
  suggestDiscard,
} from '../../src/classic'
import { formatTile, parseFace, parseTiles } from '../../src/core/tiles'

const okey = parseFace('r5')

describe('checkWinningHand', () => {
  it('recognises runs and groups, pairs, and neither', () => {
    expect(
      checkWinningHand(parseTiles('y1 y2 y3 y4 y5 y6 y7 b1 b2 b3 k1 k2 k3 k4'), okey)?.kind,
    ).toBe('runs')
    expect(
      checkWinningHand(parseTiles('y1 y1 y2 y2 y3 y3 b4 b4 b6 b6 k7 k7 k9 k9'), okey)?.kind,
    ).toBe('pairs')
    expect(
      checkWinningHand(parseTiles('y1 y2 y3 y4 y5 y6 y7 b1 b2 b3 k1 k2 k3 k6'), okey),
    ).toBeNull()
    expect(checkWinningHand(parseTiles('y1 y2 y3'), okey)).toBeNull()
  })

  it('needs exactly seven pairs', () => {
    const six = parseTiles('y1 y1 y2 y2 y3 y3 b4 b4 b6 b6 k7 k7 k9 k10')
    expect(checkWinningHand(six, okey)).toBeNull()
  })
})

describe('findWinningDiscards', () => {
  it('lists each winning discard once, best first', () => {
    const hand = parseTiles('y1 y2 y3 y4 y5 y6 y7 b1 b2 b3 k1 k2 k3 k4 r5')
    const discards = findWinningDiscards(hand, okey)
    // The okey can replace any end tile, so several discards win; the okey itself ranks first.
    expect(discards[0]).toMatchObject({ okeyDiscard: true })
    expect(discards.length).toBeGreaterThan(1)
    expect(new Set(discards.map((d) => formatTile(d.tile))).size).toBe(discards.length)
  })

  it('returns nothing for a losing hand or the wrong tile count', () => {
    expect(
      findWinningDiscards(parseTiles('y1 y2 y3 y4 y5 y6 y7 b1 b2 b3 k1 k2 k3 k6 b9'), okey),
    ).toEqual([])
    expect(findWinningDiscards(parseTiles('y1 y2 y3'), okey)).toEqual([])
  })
})

describe('isSingleColor', () => {
  it('ignores okeys and counts false jokers as the okey colour', () => {
    expect(isSingleColor(parseTiles('y1 y5 y9 r5'), okey)).toBe(true)
    expect(isSingleColor(parseTiles('y1 y5 jk'), okey)).toBe(false)
    expect(isSingleColor(parseTiles('r1 r9 jk'), okey)).toBe(true)
  })
})

describe('suggestDiscard', () => {
  it('throws the highest tile outside the melds and keeps okeys', () => {
    expect(formatTile(suggestDiscard(parseTiles('y1 y2 y3 b9 k12 r5'), okey))).toBe('k12')
    expect(formatTile(suggestDiscard(parseTiles('y1 y2 y3 r5'), okey))).toBe('y3')
    expect(() => suggestDiscard([], okey)).toThrow(RangeError)
  })
})
