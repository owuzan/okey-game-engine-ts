import { createTileSet, parseTiles, type TileId } from '../src/core/tiles'

/**
 * Builds a full 106-tile deck from notation. `hands` are in dealing order
 * (the starter first); `pile` gives the first tiles of the draw pile. Tiles
 * not mentioned fill the rest of the pile in id order.
 */
export function buildDeck(spec: {
  indicator: string
  hands: string[]
  pile?: string
  /** Tiles per hand; the starter gets one more. Default 14. */
  handSize?: number
  /** Number of seats to deal; missing hands are filled. Default 4. */
  players?: number
}): TileId[] {
  const taken = new Set<TileId>()
  const indicator = parseTiles(spec.indicator, taken)
  const hands = Array.from({ length: spec.players ?? 4 }, (_, i) =>
    parseTiles(spec.hands[i] ?? '', taken),
  )
  const pile = parseTiles(spec.pile ?? '', taken)
  // Filler comes from the top of the id range so it rarely collides with a scenario's melds.
  const rest = createTileSet()
    .filter((id) => !taken.has(id))
    .reverse()
  const deck = [...indicator]
  hands.forEach((hand, i) => {
    const size = (spec.handSize ?? 14) + (i === 0 ? 1 : 0)
    while (hand.length < size) hand.push(rest.shift() as TileId)
    deck.push(...hand)
  })
  return [...deck, ...pile, ...rest]
}
