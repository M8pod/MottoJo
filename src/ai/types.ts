import type { CardValue } from "../engine/types.js";

/** Una posizione nel Deck vista dall'esterno: o il valore (scoperta), o solo "coperta". */
export type PublicSlot = { readonly faceUp: true; readonly value: CardValue } | { readonly faceUp: false };

export type PublicGrid = readonly (readonly PublicSlot[])[];

export interface PublicPlayer {
  readonly index: number;
  readonly grid: PublicGrid;
}

/**
 * Vista del gioco così come la può legittimamente usare un giocatore virtuale
 * per decidere: mai il valore di una carta coperta, propria o altrui — stessa
 * regola anti-imbroglio della sezione 3 dello spec.
 */
export interface PublicView {
  readonly self: PublicPlayer;
  readonly opponents: readonly PublicPlayer[];
  readonly discardTop: CardValue | null;
  readonly deckSize: number;
  /** Quante copie di ciascun valore sono già state viste (carte scoperte + intera pila scarti). */
  readonly seenCounts: ReadonlyMap<CardValue, number>;
}

export type LevelNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface LevelParams {
  readonly level: LevelNumber;
  /** Probabilità di ignorare la scelta calcolata e agire in modo pressoché casuale. */
  readonly randomness: number;
  /** Quanto peso dare alla stima basata sul conteggio delle carte già viste, invece della media statica. */
  readonly countingWeight: number;
  /** Quanto peso dare alla negazione di uno scarto utile a un avversario. */
  readonly denialWeight: number;
  /** Quanto valutare il progresso altrui prima di chiudere la manche, invece di chiudere appena possibile. */
  readonly closingCaution: number;
}
