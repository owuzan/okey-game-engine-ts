import type { Seat } from '../core/game'
import type { RngState } from '../core/rng'
import type { NumberFace, TileId } from '../core/tiles'

export interface ClassicOptions {
  /** Number of players, 2 to 4. Default 4. */
  readonly players?: 2 | 3 | 4
  /** Partnership play (eşli): seats 0 and 2 against 1 and 3. Needs 4 players. Default false. */
  readonly teams?: boolean
  /** Seed for shuffling and for choosing the first dealer. Default 0. */
  readonly seed?: number | string
  /** A fixed tile order for the first hand (tests, replays). See `deal` for the layout. */
  readonly deck?: readonly TileId[]
  /** The first dealer. Default: chosen from the seed. */
  readonly firstDealer?: Seat
  /**
   * `deduct` (default): losers lose points; the match ends when a side reaches 0.
   * `countdown` (düşme): the winner subtracts points; the first side to reach 0 wins.
   */
  readonly scoring?: 'deduct' | 'countdown'
  /** Points each side starts with. Default 20. */
  readonly startingScore?: number
  /** Points for an ordinary win. Default 2. */
  readonly winPoints?: number
  /** Multiplier for finishing by discarding an okey. Default 2. */
  readonly okeyFinishMultiplier?: number
  /** Multiplier for finishing with seven pairs. Default 2. */
  readonly pairsFinishMultiplier?: number
  /** Multiplier for a winning hand of a single colour. Default 1 (off). */
  readonly singleColorMultiplier?: number
  /** Whether seven pairs is a winning hand. Default true. */
  readonly allowPairs?: boolean
  /** Points for showing the indicator; 0 disables showing. Default 1. */
  readonly indicatorPoints?: number
  /** Whether the indicator tile is drawn as the last tile of the pile. Default false. */
  readonly indicatorDrawable?: boolean
  /** End the match after this many hands regardless of score. Default: no limit. */
  readonly maxHands?: number | null
}

export type ClassicResolvedOptions = Required<Omit<ClassicOptions, 'deck' | 'seed' | 'firstDealer'>>

export interface ClassicFinish {
  readonly pairs: boolean
  readonly okeyDiscard: boolean
  readonly singleColor: boolean
}

export type ClassicHandResult =
  | {
      readonly outcome: 'win'
      readonly winner: Seat
      readonly finish: ClassicFinish
      /** Points the win is worth after multipliers. */
      readonly points: number
      /** Score change per side for this hand's win (indicator points are applied when shown). */
      readonly deltas: readonly number[]
    }
  | { readonly outcome: 'void' }

export interface ClassicState {
  readonly game: 'classic'
  readonly options: ClassicResolvedOptions
  readonly rng: RngState
  readonly phase: 'playing' | 'handOver' | 'matchOver'
  /** 1-based number of the current hand. */
  readonly handNumber: number
  readonly dealer: Seat
  /** One score per side: per seat, or per team in partnership play. */
  readonly scores: readonly number[]
  readonly indicator: TileId
  readonly okey: NumberFace
  readonly racks: readonly (readonly TileId[])[]
  /** Next tile to draw is at index 0. */
  readonly drawPile: readonly TileId[]
  /** Each seat's discard pile; the last element is on top. */
  readonly discards: readonly (readonly TileId[])[]
  readonly turn: Seat
  readonly step: 'draw' | 'discard'
  /** The tile the current player drew this turn, if any. */
  readonly drawn: TileId | null
  /** Set when the last discard was taken from an empty pile: the player may only finish. */
  readonly mustFinish: boolean
  /** Whether each seat has made its first draw or discard this hand. */
  readonly acted: readonly boolean[]
  readonly indicatorShownBy: Seat | null
  /** Result of the most recently finished hand. */
  readonly result: ClassicHandResult | null
  /** Winning sides once the match is over. */
  readonly winners: readonly number[] | null
}

export type ClassicAction =
  | { readonly type: 'draw'; readonly player: Seat; readonly from: 'pile' | 'discard' }
  | { readonly type: 'discard'; readonly player: Seat; readonly tile: TileId }
  /** Go out: discard `tile` and show the remaining fourteen. */
  | { readonly type: 'finish'; readonly player: Seat; readonly tile: TileId }
  | { readonly type: 'showIndicator'; readonly player: Seat }
  /** Only when the pile is empty: decline the last discard, ending the hand with no winner. */
  | { readonly type: 'pass'; readonly player: Seat }
  | { readonly type: 'nextHand' }

export type ClassicEvent =
  | {
      readonly type: 'handStarted'
      readonly handNumber: number
      readonly dealer: Seat
      readonly starter: Seat
      readonly indicator: TileId
    }
  | {
      readonly type: 'tileDrawn'
      readonly player: Seat
      readonly from: 'pile' | 'discard'
      /** `null` in a redacted event when another player drew from the pile. */
      readonly tile: TileId | null
    }
  | { readonly type: 'tileDiscarded'; readonly player: Seat; readonly tile: TileId }
  | {
      readonly type: 'indicatorShown'
      readonly player: Seat
      readonly tile: TileId
      readonly deltas: readonly number[]
    }
  | {
      readonly type: 'handEnded'
      readonly result: ClassicHandResult
      readonly scores: readonly number[]
      /** The winner's fourteen tiles, shown to everyone. */
      readonly hand: readonly TileId[] | null
    }
  | {
      readonly type: 'matchEnded'
      readonly winners: readonly number[]
      readonly scores: readonly number[]
    }

/** What one player is allowed to see. */
export interface ClassicPlayerView {
  readonly game: 'classic'
  readonly viewer: Seat
  readonly options: ClassicResolvedOptions
  readonly phase: ClassicState['phase']
  readonly handNumber: number
  readonly dealer: Seat
  readonly scores: readonly number[]
  readonly indicator: TileId
  readonly okey: NumberFace
  readonly rack: readonly TileId[]
  /** Tile counts per seat. */
  readonly rackSizes: readonly number[]
  /** Racks revealed at the end of a hand (the winner's), otherwise `null` per seat. */
  readonly revealedRacks: readonly (readonly TileId[] | null)[]
  readonly drawPileSize: number
  readonly discards: readonly (readonly TileId[])[]
  readonly turn: Seat
  readonly step: 'draw' | 'discard'
  readonly drawn: TileId | null
  readonly mustFinish: boolean
  readonly indicatorShownBy: Seat | null
  readonly result: ClassicHandResult | null
  readonly winners: readonly number[] | null
}

/** What a player may do right now. */
export interface ClassicAllowedActions {
  readonly drawFromPile: boolean
  readonly drawFromDiscard: boolean
  readonly discard: boolean
  /** True when at least one discard would win the hand. */
  readonly finish: boolean
  readonly showIndicator: boolean
  readonly pass: boolean
  readonly nextHand: boolean
}
