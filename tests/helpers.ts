import type { Card, PlayerDeck } from "../src/engine/types.js";

/** PRNG seedabile e deterministico, solo per i test. */
export function seededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let testCardId = 0;
export function makeCard(value: Card["value"]): Card {
  testCardId += 1;
  return { id: `test-card-${testCardId}`, value };
}

/** Crea un Deck 4x3 dai valori dati, colonna per colonna, tutti coperti salvo indicazione. */
export function makeGrid(
  values: readonly (readonly number[])[],
  faceUp = false,
): PlayerDeck {
  return values.map((column) =>
    column.map((value) => ({ card: makeCard(value as Card["value"]), faceUp })),
  );
}
