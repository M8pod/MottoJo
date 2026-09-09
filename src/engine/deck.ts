import type { Card, CardValue } from "./types.js";

/** Copie per valore, identiche al gioco Skyjo originale. Totale: 150 carte. */
export const CARD_COUNTS: readonly (readonly [CardValue, number])[] = [
  [-2, 5],
  [-1, 10],
  [0, 15],
  [1, 10],
  [2, 10],
  [3, 10],
  [4, 10],
  [5, 10],
  [6, 10],
  [7, 10],
  [8, 10],
  [9, 10],
  [10, 10],
  [11, 10],
  [12, 10],
];

export const DECK_SIZE = CARD_COUNTS.reduce((sum, [, count]) => sum + count, 0);

let idCounter = 0;
function nextCardId(): string {
  idCounter += 1;
  return `card-${idCounter}`;
}

/** Crea un mazzo completo (non mescolato) da 150 carte. */
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const [value, count] of CARD_COUNTS) {
    for (let i = 0; i < count; i += 1) {
      deck.push({ id: nextCardId(), value });
    }
  }
  return deck;
}

/**
 * Mescola un mazzo (Fisher-Yates), senza mutare l'array originale.
 * `rng` è iniettabile per test deterministici; di default Math.random.
 */
export function shuffle<T>(cards: readonly T[], rng: () => number = Math.random): T[] {
  const result = cards.slice();
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = result[i]!;
    result[i] = result[j]!;
    result[j] = tmp;
  }
  return result;
}
