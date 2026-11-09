/**
 * Tiles (taş), the indicator (gösterge) and the okey.
 *
 * A tile is identified by an integer 0..105 so that state stays plain JSON
 * and the two physical copies of a face remain distinguishable.
 *
 *   id = colorIndex * 26 + (number - 1) * 2 + copy     (0..103)
 *   104, 105 = the two false jokers (sahte okey)
 */

export const COLORS = ['red', 'yellow', 'blue', 'black'] as const
export type Color = (typeof COLORS)[number]

/** Integer tile identity, 0..105. */
export type TileId = number

export const TILE_COUNT = 106
export const FALSE_JOKER_IDS: readonly [TileId, TileId] = [104, 105]

/** The face of a numbered tile; also used to name the okey. */
export interface NumberFace {
  readonly color: Color
  readonly number: number
}

export type Face = ({ readonly kind: 'number' } & NumberFace) | { readonly kind: 'falseJoker' }

/**
 * How a tile behaves once the okey is known: either it is wild (a real okey)
 * or it stands for a fixed face (a false joker stands for the okey's face).
 */
export type ResolvedTile = { readonly wild: true } | ({ readonly wild: false } & NumberFace)

export function isFalseJoker(id: TileId): boolean {
  return id === 104 || id === 105
}

function assertTileId(id: TileId): void {
  if (!Number.isInteger(id) || id < 0 || id >= TILE_COUNT) {
    throw new RangeError(`Invalid tile id: ${id}`)
  }
}

export function tileFace(id: TileId): Face {
  assertTileId(id)
  if (id >= 104) return { kind: 'falseJoker' }
  return {
    kind: 'number',
    color: COLORS[Math.floor(id / 26)] as Color,
    number: (Math.floor(id / 2) % 13) + 1,
  }
}

/** The tile id for a face; `copy` selects which of the two physical tiles. */
export function tileId(color: Color, number: number, copy: 0 | 1 = 0): TileId {
  if (!Number.isInteger(number) || number < 1 || number > 13) {
    throw new RangeError(`Invalid tile number: ${number}`)
  }
  return COLORS.indexOf(color) * 26 + (number - 1) * 2 + copy
}

/** All 106 tile ids in order. */
export function createTileSet(): TileId[] {
  return Array.from({ length: TILE_COUNT }, (_, i) => i)
}

/** The okey is the tile one above the indicator in the same colour; 13 wraps to 1. */
export function okeyFromIndicator(indicator: TileId): NumberFace {
  const face = tileFace(indicator)
  if (face.kind === 'falseJoker') {
    throw new RangeError('A false joker cannot be the indicator')
  }
  return { color: face.color, number: face.number === 13 ? 1 : face.number + 1 }
}

/** True when the tile is a real okey (wild). */
export function isOkey(id: TileId, okey: NumberFace): boolean {
  const face = tileFace(id)
  return face.kind === 'number' && face.color === okey.color && face.number === okey.number
}

export function resolveTile(id: TileId, okey: NumberFace): ResolvedTile {
  const face = tileFace(id)
  if (face.kind === 'falseJoker') return { wild: false, color: okey.color, number: okey.number }
  if (face.color === okey.color && face.number === okey.number) return { wild: true }
  return { wild: false, color: face.color, number: face.number }
}

// ---------------------------------------------------------------------------
// Text notation: r5 y13 b1 k7 jk
// ---------------------------------------------------------------------------

const COLOR_LETTER: Record<Color, string> = { red: 'r', yellow: 'y', blue: 'b', black: 'k' }
const LETTER_COLOR: Record<string, Color> = { r: 'red', y: 'yellow', b: 'blue', k: 'black' }

export function formatTile(id: TileId): string {
  const face = tileFace(id)
  return face.kind === 'falseJoker' ? 'jk' : `${COLOR_LETTER[face.color]}${face.number}`
}

export function formatTiles(ids: readonly TileId[]): string {
  return ids.map(formatTile).join(' ')
}

/** Parses one face such as `r5` into a {@link NumberFace}. */
export function parseFace(text: string): NumberFace {
  const match = /^([rybk])(\d{1,2})$/.exec(text.trim().toLowerCase())
  const color = match ? LETTER_COLOR[match[1] as string] : undefined
  const number = match ? Number(match[2]) : 0
  if (!color || number < 1 || number > 13) throw new SyntaxError(`Invalid tile: "${text}"`)
  return { color, number }
}

/**
 * Parses whitespace-separated notation into tile ids. The first mention of a
 * face gets copy 0, the second copy 1; a third mention is an error. Pass
 * `taken` to continue allocating copies across several calls.
 */
export function parseTiles(text: string, taken: Set<TileId> = new Set()): TileId[] {
  const result: TileId[] = []
  for (const token of text.trim().split(/\s+/)) {
    if (token === '') continue
    let candidates: TileId[]
    if (token.toLowerCase() === 'jk') {
      candidates = [...FALSE_JOKER_IDS]
    } else {
      const face = parseFace(token)
      candidates = [tileId(face.color, face.number, 0), tileId(face.color, face.number, 1)]
    }
    const id = candidates.find((c) => !taken.has(c))
    if (id === undefined) throw new SyntaxError(`More than two copies of "${token}"`)
    taken.add(id)
    result.push(id)
  }
  return result
}
