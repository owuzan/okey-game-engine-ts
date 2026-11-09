import { describe, expect, it } from 'vitest'
import { nextInt, seedRng, shuffle } from '../../src/core/rng'
import {
  createTileSet,
  formatTiles,
  isOkey,
  okeyFromIndicator,
  parseFace,
  parseTiles,
  resolveTile,
  tileFace,
  tileId,
} from '../../src/core/tiles'

describe('tile set', () => {
  it('has 106 tiles: two copies of 52 faces and two false jokers', () => {
    const faces = new Map<string, number>()
    for (const id of createTileSet()) {
      const face = tileFace(id)
      const key = face.kind === 'number' ? `${face.color}${face.number}` : 'jk'
      faces.set(key, (faces.get(key) ?? 0) + 1)
    }
    expect(faces.size).toBe(53)
    expect([...faces.values()].every((n) => n === 2)).toBe(true)
  })

  it('round-trips ids and faces', () => {
    expect(tileFace(tileId('blue', 7, 1))).toEqual({ kind: 'number', color: 'blue', number: 7 })
    expect(() => tileFace(106)).toThrow(RangeError)
    expect(() => tileId('red', 14)).toThrow(RangeError)
  })
})

describe('indicator and okey', () => {
  it('makes the okey one above the indicator in the same colour', () => {
    expect(okeyFromIndicator(tileId('red', 5))).toEqual({ color: 'red', number: 6 })
  })

  it('wraps an indicator of 13 to an okey of 1', () => {
    expect(okeyFromIndicator(tileId('black', 13))).toEqual({ color: 'black', number: 1 })
  })

  it('rejects a false joker as indicator', () => {
    expect(() => okeyFromIndicator(104)).toThrow(RangeError)
  })

  it('treats okey-faced tiles as wild and false jokers as the okey face', () => {
    const okey = parseFace('y4')
    expect(resolveTile(tileId('yellow', 4), okey)).toEqual({ wild: true })
    expect(isOkey(tileId('yellow', 4, 1), okey)).toBe(true)
    expect(resolveTile(104, okey)).toEqual({ wild: false, color: 'yellow', number: 4 })
    expect(isOkey(104, okey)).toBe(false)
    expect(resolveTile(tileId('red', 4), okey)).toEqual({ wild: false, color: 'red', number: 4 })
  })
})

describe('notation', () => {
  it('parses and formats tiles, allocating copies in order', () => {
    const ids = parseTiles('r5 r5 y13 b1 k7 jk jk')
    expect(new Set(ids).size).toBe(7)
    expect(formatTiles(ids)).toBe('r5 r5 y13 b1 k7 jk jk')
  })

  it('shares copy allocation across calls through `taken`', () => {
    const taken = new Set<number>()
    const [a] = parseTiles('r5', taken)
    const [b] = parseTiles('r5', taken)
    expect(a).not.toBe(b)
    expect(() => parseTiles('r5', taken)).toThrow(SyntaxError)
  })

  it('rejects malformed tiles', () => {
    expect(() => parseTiles('g5')).toThrow(SyntaxError)
    expect(() => parseTiles('r14')).toThrow(SyntaxError)
    expect(() => parseFace('r0')).toThrow(SyntaxError)
  })
})

describe('rng', () => {
  it('is deterministic for a seed and differs across seeds', () => {
    const [a] = shuffle(createTileSet(), seedRng(42))
    const [b] = shuffle(createTileSet(), seedRng(42))
    const [c] = shuffle(createTileSet(), seedRng('table-7'))
    expect(a).toEqual(b)
    expect(a).not.toEqual(c)
    expect(a.slice().sort((x, y) => x - y)).toEqual(createTileSet())
  })

  it('draws integers within the bound', () => {
    let state = seedRng(1)
    for (let i = 0; i < 500; i++) {
      const [value, next] = nextInt(state, 6)
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(6)
      state = next
    }
  })
})
