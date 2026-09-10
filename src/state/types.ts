import type { Card, CardValue, PlayerDeck } from "../engine/types.js";

export interface RoundPlayer {
  readonly id: string;
  readonly name: string;
  readonly isHuman: boolean;
  readonly grid: PlayerDeck;
}

export type RoundPhase = "initial-reveal" | "playing" | "final-turn" | "round-over";

interface BaseEvent {
  readonly playerIndex: number;
}

export interface InitialRevealEvent extends BaseEvent {
  readonly type: "initial-reveal";
  readonly column: number;
  readonly row: number;
  readonly value: CardValue;
}

/** Pesca dal mazzo, scarta subito e scopre una propria carta coperta (invariata). */
export interface DiscardMoveEvent extends BaseEvent {
  readonly type: "move";
  readonly source: "deck";
  readonly action: "discard";
  readonly discardedValue: CardValue;
  readonly column: number;
  readonly row: number;
  readonly revealedValue: CardValue;
}

/** Sostituzione di una posizione, sia da mazzo coperto (tenuta) sia da scarti (obbligata). */
export interface ReplaceMoveEvent extends BaseEvent {
  readonly type: "move";
  readonly source: "deck" | "discard";
  readonly action: "replace";
  readonly column: number;
  readonly row: number;
  readonly placedValue: CardValue;
  readonly previous: { readonly faceUp: boolean; readonly value: CardValue };
}

export type MoveEvent = DiscardMoveEvent | ReplaceMoveEvent;

export interface ColumnClearedEvent extends BaseEvent {
  readonly type: "column-cleared";
  readonly column: number;
  readonly value: CardValue;
}

export interface RoundClosedEvent extends BaseEvent {
  readonly type: "round-closed";
}

export interface HandoffToHumanEvent extends BaseEvent {
  readonly type: "handoff-to-human";
}

/** Chi inizia la manche (dopo che tutti hanno scoperto le due carte iniziali) e con quanti punti scoperti. */
export interface PlayingStartedEvent extends BaseEvent {
  readonly type: "playing-started";
  readonly points: number;
}

export type RoundEvent =
  | InitialRevealEvent
  | MoveEvent
  | ColumnClearedEvent
  | RoundClosedEvent
  | HandoffToHumanEvent
  | PlayingStartedEvent;

export interface RoundState {
  readonly roundNumber: number;
  readonly players: readonly RoundPlayer[];
  /** Chi ha chiuso la manche precedente; null per la prima manche della partita. */
  readonly previousCloserIndex: number | null;
  readonly phase: RoundPhase;
  readonly deck: readonly Card[];
  readonly discard: readonly Card[];
  /** Ordine ciclico dei giocatori a partire da chi inizia; null finché non determinato. */
  readonly turnOrder: readonly number[] | null;
  readonly currentTurnIndex: number;
  readonly closingPlayerIndex: number | null;
  readonly finalTurnsRemaining: number;
  readonly history: readonly RoundEvent[];
}

export type RoundAction =
  | { readonly type: "REVEAL_INITIAL_CARD"; readonly playerIndex: number; readonly column: number; readonly row: number }
  | { readonly type: "DRAW_AND_KEEP"; readonly column: number; readonly row: number }
  | { readonly type: "DRAW_AND_DISCARD"; readonly column: number; readonly row: number }
  | { readonly type: "TAKE_DISCARD_AND_REPLACE"; readonly column: number; readonly row: number };
