import type { Seat } from '../core/game'
import type { Meld } from '../core/melds'
import type { RngState } from '../core/rng'
import type { NumberFace, TileId } from '../core/tiles'

export interface Okey101Options {
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
  /** Number of scored hands in the match. Default 5. */
  readonly hands?: number
  /**
   * Rising opening barrier (katlamalı). `off`: everyone opens at the base
   * threshold. `all`: each opening must beat the previous one by a point (or
   * a pair). `opponents`: only the other team's openings raise your barrier.
   * Default `off`.
   */
  readonly escalation?: 'off' | 'all' | 'opponents'
  /** Points needed to open with runs and groups. Default 101. */
  readonly openingThreshold?: number
  /** Pairs needed to open with pairs. Default 5. */
  readonly minPairs?: number
  /** Whether an opened player may swap a real tile for an okey on the table. Default true. */
  readonly okeySwap?: boolean
  /** Whether runs openers may lay pairs once someone has opened with pairs. Default true. */
  readonly pairsAfterPairsOpener?: boolean
  /** Whether going out from hand (elden) needs that nobody else has opened. Default true. */
  readonly eldenNeedsClosedTable?: boolean
  /** Points for an in-play penalty. Default 101. */
  readonly penaltyPoints?: number
  /** Penalise a rejected opening instead of only refusing it. Default false. */
  readonly penalizeInvalidOpening?: boolean
  /** Penalise discarding a tile that fits a meld on the table. Default true. */
  readonly penalizeLayableDiscard?: boolean
  /** Penalise discarding an okey other than to go out. Default true. */
  readonly penalizeOkeyDiscard?: boolean
  /** Penalise taking the discard and putting it back. Default false. */
  readonly penalizeReturnedDiscard?: boolean
  /**
   * Live-table rule: when your discard is taken and used, you pay the tile's
   * number times this factor. Default 0 (off); tables that use it play 10.
   */
  readonly takenDiscardFactor?: number
  /** What the winner scores (negated). Default 101. */
  readonly winBonus?: number
  /** Hand score of a player who never opened. Default 202. */
  readonly unopenedPenalty?: number
  /** What an okey left in an opened hand counts as. Default 101. */
  readonly okeyInHandPoints?: number
  /**
   * When the pile runs out: `score` the hands with no winner, or `void` the
   * hand (only okeys in hand and in-play penalties count). Default `score`.
   */
  readonly pileExhausted?: 'score' | 'void'
}

export type Okey101ResolvedOptions = Required<Omit<Okey101Options, 'deck' | 'seed' | 'firstDealer'>>

/** A meld on the table. */
export interface TableMeld extends Meld {
  /** Stable within a hand. */
  readonly id: number
  readonly owner: Seat
}

export type OpeningKind = 'runs' | 'pairs'

export interface Opening {
  readonly player: Seat
  readonly kind: OpeningKind
  /** Points for a runs opening, number of pairs for a pairs opening. */
  readonly value: number
  /** True when the player laid all but one tile at once (elden). */
  readonly elden: boolean
}

export type PenaltyReason =
  | 'invalidOpening'
  | 'layableDiscard'
  | 'okeyDiscard'
  | 'returnedDiscard'
  | 'discardTaken'

export interface Okey101Finish {
  readonly okeyDiscard: boolean
  readonly pairs: boolean
  readonly elden: boolean
}

export interface Okey101HandResult {
  /** `win`: someone went out. `exhausted`: pile ran out and hands were scored. `void`: no hand scores. */
  readonly outcome: 'win' | 'exhausted' | 'void'
  readonly winner: Seat | null
  readonly finish: Okey101Finish | null
  /** 1, 2, 4 or 8. */
  readonly multiplier: number
  /** This hand's score per seat, in-play penalties included. Lower is better. */
  readonly handScores: readonly number[]
}

export interface Okey101State {
  readonly game: 'okey101'
  readonly options: Okey101ResolvedOptions
  readonly rng: RngState
  readonly phase: 'playing' | 'handOver' | 'matchOver'
  /** 1-based number of the current scored hand; a void hand is replayed under the same number. */
  readonly handNumber: number
  readonly dealer: Seat
  /** Running total per seat. Lower is better. */
  readonly scores: readonly number[]
  readonly indicator: TileId
  readonly okey: NumberFace
  readonly racks: readonly (readonly TileId[])[]
  /** Next tile to draw is at index 0. */
  readonly drawPile: readonly TileId[]
  /** Each seat's discard pile; the last element is on top. */
  readonly discards: readonly (readonly TileId[])[]
  readonly table: readonly TableMeld[]
  readonly nextMeldId: number
  /** Openings of this hand in order. */
  readonly openings: readonly Opening[]
  /** In-play penalty points per seat this hand. */
  readonly penalties: readonly number[]
  readonly turn: Seat
  readonly step: 'draw' | 'play'
  /** The tile the current player drew this turn, if any. */
  readonly drawn: TileId | null
  /** A discard taken this turn that has not been used on the table yet. */
  readonly taken: TileId | null
  readonly result: Okey101HandResult | null
  /** Winning sides once the match is over. */
  readonly winners: readonly number[] | null
}

export type Okey101Action =
  | { readonly type: 'draw'; readonly player: Seat; readonly from: 'pile' | 'discard' }
  /** Put a taken discard back and draw from the pile instead. */
  | { readonly type: 'returnDiscard'; readonly player: Seat }
  /**
   * Lay melds from the rack. For a player who has not opened this is the
   * opening and must meet the barrier (or go out from hand).
   */
  | { readonly type: 'meld'; readonly player: Seat; readonly melds: readonly (readonly TileId[])[] }
  /** Add a tile to a run or group on the table (işleme). */
  | { readonly type: 'layOff'; readonly player: Seat; readonly tile: TileId; readonly meld: number }
  /** Replace an okey on the table with the tile it stands for and take the okey. */
  | {
      readonly type: 'swapOkey'
      readonly player: Seat
      readonly tile: TileId
      readonly meld: number
    }
  /** End the turn. Discarding the last tile goes out. */
  | { readonly type: 'discard'; readonly player: Seat; readonly tile: TileId }
  /** Only when the pile is empty: decline the last discard, ending the hand. */
  | { readonly type: 'pass'; readonly player: Seat }
  | { readonly type: 'nextHand' }

export type Okey101Event =
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
  | { readonly type: 'discardReturned'; readonly player: Seat; readonly tile: TileId }
  | { readonly type: 'opened'; readonly opening: Opening }
  | { readonly type: 'meldsLaid'; readonly player: Seat; readonly melds: readonly TableMeld[] }
  | {
      readonly type: 'tileLaidOff'
      readonly player: Seat
      readonly tile: TileId
      readonly meld: TableMeld
    }
  | {
      readonly type: 'okeySwapped'
      readonly player: Seat
      readonly tile: TileId
      readonly okey: TileId
      readonly meld: TableMeld
    }
  | { readonly type: 'tileDiscarded'; readonly player: Seat; readonly tile: TileId }
  | {
      readonly type: 'penalty'
      readonly player: Seat
      readonly reason: PenaltyReason
      readonly points: number
    }
  | {
      readonly type: 'handEnded'
      readonly result: Okey101HandResult
      readonly scores: readonly number[]
      /** Every rack at the end of the hand. */
      readonly racks: readonly (readonly TileId[])[]
    }
  | {
      readonly type: 'matchEnded'
      readonly winners: readonly number[]
      readonly scores: readonly number[]
    }

/** What one player is allowed to see. */
export interface Okey101PlayerView {
  readonly game: 'okey101'
  readonly viewer: Seat
  readonly options: Okey101ResolvedOptions
  readonly phase: Okey101State['phase']
  readonly handNumber: number
  readonly dealer: Seat
  readonly scores: readonly number[]
  readonly indicator: TileId
  readonly okey: NumberFace
  readonly rack: readonly TileId[]
  readonly rackSizes: readonly number[]
  /** All racks once the hand is over, otherwise `null`. */
  readonly revealedRacks: readonly (readonly TileId[])[] | null
  readonly drawPileSize: number
  readonly discards: readonly (readonly TileId[])[]
  readonly table: readonly TableMeld[]
  readonly openings: readonly Opening[]
  readonly penalties: readonly number[]
  readonly turn: Seat
  readonly step: 'draw' | 'play'
  readonly drawn: TileId | null
  readonly taken: TileId | null
  readonly result: Okey101HandResult | null
  readonly winners: readonly number[] | null
}

/** What a player may do right now. */
export interface Okey101AllowedActions {
  readonly drawFromPile: boolean
  readonly drawFromDiscard: boolean
  readonly returnDiscard: boolean
  /** Laying melds from the rack (opening, or further melds once opened). */
  readonly meld: boolean
  readonly layOff: boolean
  readonly swapOkey: boolean
  readonly discard: boolean
  readonly pass: boolean
  readonly nextHand: boolean
  /** What an opening must reach right now for this player. */
  readonly requiredPoints: number
  readonly requiredPairs: number
}
