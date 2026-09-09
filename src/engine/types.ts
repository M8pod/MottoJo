/** Valore di una carta: da -2 a 12. */
export type CardValue =
  | -2 | -1 | 0
  | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export interface Card {
  readonly id: string;
  readonly value: CardValue;
}

export interface GridSlot {
  readonly card: Card;
  readonly faceUp: boolean;
}

/**
 * Deck di un giocatore: colonne da sinistra a destra, ogni colonna 3 slot
 * dall'alto in basso (riga 0..2). Una colonna annullata viene rimossa
 * dall'array: le colonne successive slittano a sinistra e si rinumerano.
 */
export type PlayerDeck = readonly (readonly GridSlot[])[];

export interface RowCol {
  readonly column: number;
  readonly row: number;
}
