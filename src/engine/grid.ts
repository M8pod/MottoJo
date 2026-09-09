import type { Card, GridSlot, PlayerDeck } from "./types.js";

export const GRID_ROWS = 3;
export const GRID_COLUMNS = 4;
export const CARDS_PER_PLAYER = GRID_ROWS * GRID_COLUMNS;

/** Distribuisce le prime 12 carte dello stack a un giocatore (tutte coperte). */
export function dealGrid(stack: readonly Card[]): { grid: PlayerDeck; remaining: Card[] } {
  if (stack.length < CARDS_PER_PLAYER) {
    throw new Error(
      `Carte insufficienti per distribuire un Deck: servono ${CARDS_PER_PLAYER}, disponibili ${stack.length}.`,
    );
  }
  const dealt = stack.slice(0, CARDS_PER_PLAYER);
  const remaining = stack.slice(CARDS_PER_PLAYER);

  const grid: GridSlot[][] = [];
  for (let col = 0; col < GRID_COLUMNS; col += 1) {
    const column: GridSlot[] = [];
    for (let row = 0; row < GRID_ROWS; row += 1) {
      const card = dealt[col * GRID_ROWS + row]!;
      column.push({ card, faceUp: false });
    }
    grid.push(column);
  }
  return { grid, remaining };
}

function assertValidPosition(grid: PlayerDeck, column: number, row: number): void {
  if (column < 0 || column >= grid.length) {
    throw new Error(`Colonna ${column} non valida: il Deck ha ${grid.length} colonne.`);
  }
  if (row < 0 || row >= GRID_ROWS) {
    throw new Error(`Riga ${row} non valida: il Deck ha ${GRID_ROWS} righe.`);
  }
}

export function getSlot(grid: PlayerDeck, column: number, row: number): GridSlot {
  assertValidPosition(grid, column, row);
  return grid[column]![row]!;
}

function withSlot(grid: PlayerDeck, column: number, row: number, slot: GridSlot): PlayerDeck {
  return grid.map((col, c) =>
    c === column ? col.map((s, r) => (r === row ? slot : s)) : col,
  );
}

/** Scopre una carta ancora coperta senza cambiarla (fase di scoperta iniziale, o scarto diretto). */
export function revealCoveredCard(grid: PlayerDeck, column: number, row: number): PlayerDeck {
  const slot = getSlot(grid, column, row);
  if (slot.faceUp) {
    throw new Error(`La carta in riga ${row + 1} colonna ${column + 1} è già scoperta.`);
  }
  return withSlot(grid, column, row, { card: slot.card, faceUp: true });
}

/**
 * Sostituisce la carta in una posizione con `newCard` (sempre scoperta).
 * Restituisce il nuovo Deck e la carta rimossa (va scoperta e scartata,
 * indipendentemente dal fatto che fosse già scoperta o ancora coperta).
 */
export function replaceCard(
  grid: PlayerDeck,
  column: number,
  row: number,
  newCard: Card,
): { grid: PlayerDeck; discarded: Card } {
  const slot = getSlot(grid, column, row);
  return {
    grid: withSlot(grid, column, row, { card: newCard, faceUp: true }),
    discarded: slot.card,
  };
}

/**
 * Individua le colonne completamente scoperte con lo stesso valore e le
 * rimuove, facendo slittare a sinistra le colonne successive. La griglia
 * resta sempre compatta e le posizioni restanti si rinumerano di conseguenza.
 */
export function checkAndClearMatchingColumns(grid: PlayerDeck): {
  grid: PlayerDeck;
  clearedColumns: number[];
} {
  const clearedColumns: number[] = [];
  const kept: (readonly GridSlot[])[] = [];

  grid.forEach((column, index) => {
    const allFaceUp = column.every((slot) => slot.faceUp);
    const sameValue = allFaceUp && column.every((slot) => slot.card.value === column[0]!.card.value);
    if (sameValue) {
      clearedColumns.push(index);
    } else {
      kept.push(column);
    }
  });

  return { grid: kept, clearedColumns };
}

/** True quando ogni carta rimasta nel Deck è scoperta (condizione di chiusura manche). */
export function isGridComplete(grid: PlayerDeck): boolean {
  return grid.every((column) => column.every((slot) => slot.faceUp));
}

/** Somma dei valori delle sole carte attualmente scoperte (punteggio parziale, in ascolto). */
export function sumFaceUpValues(grid: PlayerDeck): number {
  return grid.reduce(
    (sum, column) =>
      sum + column.reduce((colSum, slot) => colSum + (slot.faceUp ? slot.card.value : 0), 0),
    0,
  );
}

/** Punteggio di fine manche: somma di TUTTE le carte rimaste nel Deck, scoperte o no. */
export function scoreGrid(grid: PlayerDeck): number {
  return grid.reduce(
    (sum, column) => sum + column.reduce((colSum, slot) => colSum + slot.card.value, 0),
    0,
  );
}
