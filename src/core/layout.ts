/**
 * Rack (ıstaka) presentation helpers: sorting and placing tiles on a
 * two-row rack. Purely cosmetic; the engine never depends on slot positions.
 */

import type { Arrangement } from './solver'
import { COLORS, type NumberFace, resolveTile, type TileId, tileFace } from './tiles'

function sortKey(id: TileId, okey: NumberFace | undefined, byNumber: boolean): number {
  let color = 4
  let number = 14
  if (okey) {
    const r = resolveTile(id, okey)
    // Okeys go last so they are easy to spot.
    if (r.wild) return 10_000 + id
    color = COLORS.indexOf(r.color)
    number = r.number
  } else {
    const face = tileFace(id)
    if (face.kind === 'number') {
      color = COLORS.indexOf(face.color)
      number = face.number
    }
  }
  return (byNumber ? number * 10 + color : color * 100 + number) * 10 + (id % 2)
}

/** Sorts by colour, then number. With `okey`, okeys go last and false jokers sit at the okey's face. */
export function sortByColor(tiles: readonly TileId[], okey?: NumberFace): TileId[] {
  return tiles.slice().sort((a, b) => sortKey(a, okey, false) - sortKey(b, okey, false))
}

/** Sorts by number, then colour. With `okey`, okeys go last and false jokers sit at the okey's face. */
export function sortByNumber(tiles: readonly TileId[], okey?: NumberFace): TileId[] {
  return tiles.slice().sort((a, b) => sortKey(a, okey, true) - sortKey(b, okey, true))
}

export interface RackLayoutOptions {
  /** Number of rows on the rack. Default 2. */
  readonly rows?: number
  /** Slots per row. Default 16. */
  readonly columns?: number
}

/** A rack as rows of slots; `null` is an empty slot. */
export type RackLayout = (TileId | null)[][]

/**
 * Places an arrangement on the rack: each meld as a block, one empty slot
 * between blocks, leftover tiles last. Blocks are kept on a single row when
 * possible; if the rack is too tight the gaps are dropped.
 */
export function layoutRack(
  arrangement: Pick<Arrangement, 'melds' | 'leftover'> | readonly (readonly TileId[])[],
  options: RackLayoutOptions = {},
): RackLayout {
  const rows = options.rows ?? 2
  const columns = options.columns ?? 16
  const blocks: (readonly TileId[])[] = Array.isArray(arrangement)
    ? (arrangement as readonly (readonly TileId[])[]).filter((b) => b.length > 0)
    : [
        ...(arrangement as Pick<Arrangement, 'melds' | 'leftover'>).melds.map((m) => m.tiles),
        ...((arrangement as Pick<Arrangement, 'leftover'>).leftover.length > 0
          ? [(arrangement as Pick<Arrangement, 'leftover'>).leftover]
          : []),
      ]
  const total = blocks.reduce((sum, b) => sum + b.length, 0)
  if (total > rows * columns) {
    throw new RangeError(`${total} tiles do not fit on a ${rows}x${columns} rack`)
  }

  const spaced = placeBlocks(blocks, rows, columns)
  if (spaced) return spaced

  // Too tight for gaps: fill the slots in reading order.
  const flat = blocks.flat()
  return Array.from({ length: rows }, (_, row) =>
    Array.from({ length: columns }, (_, column) => flat[row * columns + column] ?? null),
  )
}

function placeBlocks(
  blocks: readonly (readonly TileId[])[],
  rows: number,
  columns: number,
): RackLayout | null {
  const layout: RackLayout = Array.from({ length: rows }, () =>
    Array.from({ length: columns }, () => null),
  )
  let row = 0
  let column = 0
  for (const block of blocks) {
    if (block.length > columns) return null
    if (column > 0) column++ // gap after the previous block
    if (column + block.length > columns) {
      row++
      column = 0
    }
    const slots = layout[row]
    if (!slots) return null
    for (const id of block) slots[column++] = id
  }
  return layout
}
