import { describe, expect, it } from 'vitest'
import { analyzeMeld, extendMeld, meldOkeys } from '../../src/core/melds'
import { formatTiles, parseFace, parseTiles, tileId } from '../../src/core/tiles'

const okey = parseFace('k9')
const meld = (text: string, as?: 'run' | 'group' | 'pair') =>
  analyzeMeld(parseTiles(text), okey, as ? { as } : {})
const faces = (text: string) =>
  formatTiles((meld(text)?.faces ?? []).map((f) => tileId(f.color, f.number)))

describe('runs', () => {
  it('accepts three or more consecutive tiles of one colour', () => {
    expect(meld('r3 r4 r5')).toMatchObject({ kind: 'run', points: 12 })
    expect(meld('b1 b2 b3 b4 b5 b6 b7 b8 b9 b10 b11 b12 b13')?.kind).toBe('run')
  })

  it('normalises any order to ascending', () => {
    expect(formatTiles(meld('r5 r3 r4')?.tiles ?? [])).toBe('r3 r4 r5')
  })

  it('rejects mixed colours, gaps, duplicates and short runs', () => {
    expect(meld('r3 r4 y5')).toBeNull()
    expect(meld('r3 r4 r6')).toBeNull()
    expect(meld('r3 r3 r4')).toBeNull()
    expect(meld('r3 r4', 'run')).toBeNull()
  })

  it('lets 1 follow 13 but not bridge 13 and 2', () => {
    expect(meld('r12 r13 r1')).toMatchObject({ kind: 'run', points: 26 })
    expect(meld('r11 r12 r13 r1')?.kind).toBe('run')
    expect(meld('r13 r1 r2')).toBeNull()
    expect(meld('r1 r2 r3 r4 r5 r6 r7 r8 r9 r10 r11 r12 r13 r1')).toBeNull()
  })

  it('fills a gap with the okey', () => {
    expect(faces('r3 k9 r5')).toBe('r3 r4 r5')
    expect(faces('r5 r3 k9')).toBe('r3 r4 r5')
  })

  it('honours the position the okey is given in', () => {
    expect(faces('k9 r3 r4')).toBe('r2 r3 r4')
    expect(faces('r3 r4 k9')).toBe('r3 r4 r5')
  })

  it('extends upward first when order does not decide', () => {
    expect(faces('r4 k9 r3')).toBe('r3 r4 r5')
    expect(faces('r13 k9 r12')).toBe('r11 r12 r13')
  })

  it('uses a false joker as the okey face, not as a wild', () => {
    expect(faces('k8 jk k10')).toBe('k8 k9 k10')
    expect(meld('r3 jk r5')).toBeNull()
  })
})

describe('groups', () => {
  it('accepts three or four of a number in different colours', () => {
    expect(meld('r7 y7 b7')).toMatchObject({ kind: 'group', points: 21 })
    expect(meld('r7 y7 b7 k7')).toMatchObject({ kind: 'group', points: 28 })
  })

  it('rejects repeated colours and five tiles', () => {
    expect(meld('r7 r7 b7')).toBeNull()
    expect(meld('r7 y7 b7 k7 k9')).toBeNull()
  })

  it('lets the okey stand for a missing colour', () => {
    expect(meld('r7 y7 k9')).toMatchObject({ kind: 'group', points: 21 })
    expect(meldOkeys(meld('r7 y7 k9')!, okey)[0]?.face).toEqual({ color: 'blue', number: 7 })
  })

  it('reads two okeys and one tile as a run unless forced', () => {
    expect(meld('r7 k9 k9')?.kind).toBe('run')
    expect(meld('r7 k9 k9', 'group')).toMatchObject({ kind: 'group', points: 21 })
  })
})

describe('pairs', () => {
  it('accepts two identical faces', () => {
    expect(meld('r7 r7')).toMatchObject({ kind: 'pair', points: 14 })
    expect(meld('r7 y7')).toBeNull()
    expect(meld('r7 r8')).toBeNull()
  })

  it('pairs an okey with anything, and two okeys together', () => {
    expect(meld('r7 k9')?.kind).toBe('pair')
    expect(meld('k9 k9')?.kind).toBe('pair')
  })

  it('pairs a false joker only with the other false joker or an okey', () => {
    expect(meld('jk jk')?.kind).toBe('pair')
    expect(meld('jk r7')).toBeNull()
  })
})

describe('general', () => {
  it('rejects the same physical tile twice', () => {
    const [a] = parseTiles('r3')
    expect(analyzeMeld([a!, a!, a!], okey)).toBeNull()
  })

  it('rejects melds made only of okeys', () => {
    expect(meld('k9 k9', 'run')).toBeNull()
  })
})

describe('extending a meld', () => {
  const taken = new Set<number>()
  const run = analyzeMeld(parseTiles('r5 r6 r7', taken), okey)!
  const tile = (text: string) => parseTiles(text, taken)[0]!

  it('adds to either end of a run', () => {
    expect(formatTiles(extendMeld(run, tile('r8'), okey)?.tiles ?? [])).toBe('r5 r6 r7 r8')
    expect(formatTiles(extendMeld(run, tile('r4'), okey)?.tiles ?? [])).toBe('r4 r5 r6 r7')
    expect(extendMeld(run, tile('r9'), okey)).toBeNull()
    expect(extendMeld(run, tile('y8'), okey)).toBeNull()
  })

  it('puts an okey on the top end', () => {
    const extended = extendMeld(run, tile('k9'), okey)
    expect(extended?.faces.at(-1)).toEqual({ color: 'red', number: 8 })
  })

  it('adds a high one after 13 only', () => {
    const top = analyzeMeld(parseTiles('y11 y12 y13', taken), okey)!
    expect(extendMeld(top, tile('y1'), okey)?.points).toBe(37)
    const low = analyzeMeld(parseTiles('b1 b2 b3', taken), okey)!
    expect(extendMeld(low, tile('b13'), okey)).toBeNull()
  })

  it('adds the fourth colour to a group and nothing after', () => {
    const group = analyzeMeld(parseTiles('r2 y2 b2', taken), okey)!
    const full = extendMeld(group, tile('k2'), okey)
    expect(full?.tiles).toHaveLength(4)
    expect(extendMeld(group, tile('r2'), okey)).toBeNull()
    expect(extendMeld(full!, tile('k9'), okey)).toBeNull()
  })

  it('does not extend pairs', () => {
    const pair = analyzeMeld(parseTiles('b10 b10', taken), okey)!
    expect(extendMeld(pair, tile('y9'), okey)).toBeNull()
  })
})
