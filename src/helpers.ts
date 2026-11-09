/**
 * Everything that works without a game state: tiles, melds, solvers and
 * rack layout. Safe to run on a client that only knows its own rack.
 */

export type { ApplyResult, ErrorCode, RuleError, Seat } from './core/game'
export {
  layoutRack,
  type RackLayout,
  type RackLayoutOptions,
  sortByColor,
  sortByNumber,
} from './core/layout'
export {
  type AnalyzeOptions,
  analyzeMeld,
  extendMeld,
  type Meld,
  type MeldKind,
  type MeldRules,
  meldOkeys,
} from './core/melds'
export { nextInt, nextRandom, type RngState, seedRng, shuffle } from './core/rng'
export { type Arrangement, type ArrangeOptions, arrangePairs, arrangeRuns } from './core/solver'
export {
  COLORS,
  type Color,
  createTileSet,
  FALSE_JOKER_IDS,
  type Face,
  formatTile,
  formatTiles,
  isFalseJoker,
  isOkey,
  type NumberFace,
  okeyFromIndicator,
  parseFace,
  parseTiles,
  type ResolvedTile,
  resolveTile,
  TILE_COUNT,
  type TileId,
  tileFace,
  tileId,
} from './core/tiles'
