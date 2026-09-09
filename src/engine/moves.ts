import type { Card, PlayerDeck } from "./types.js";
import { shuffle } from "./deck.js";
import { getSlot, replaceCard, revealCoveredCard } from "./grid.js";

/**
 * Mazzo coperto (pila di pesca) e scarti. Convenzione: l'indice 0 è sempre
 * la carta in cima (l'ultima pescata/scartata).
 */
export interface DrawState {
  readonly deck: readonly Card[];
  readonly discard: readonly Card[];
}

/**
 * Pesca la carta in cima al mazzo coperto. Se il mazzo è vuoto, rimescola
 * gli scarti (tranne l'ultima carta buttata, che resta in cima agli scarti)
 * per formare il nuovo mazzo coperto, come da regola.
 */
export function drawFromDeck(
  state: DrawState,
  rng: () => number = Math.random,
): { card: Card; deck: Card[]; discard: Card[] } {
  let { deck, discard } = state;

  if (deck.length === 0) {
    if (discard.length <= 1) {
      throw new Error("Mazzo coperto e scarti esauriti: impossibile pescare.");
    }
    const [top, ...rest] = discard;
    deck = shuffle(rest, rng);
    discard = [top!];
  }

  const [card, ...restDeck] = deck;
  return { card: card!, deck: restDeck, discard: discard.slice() };
}

/** Prende la carta in cima agli scarti (obbligatorio usarla per una sostituzione). */
export function takeFromDiscard(state: DrawState): { card: Card; discard: Card[] } {
  if (state.discard.length === 0) {
    throw new Error("Non ci sono scarti da prendere.");
  }
  const [card, ...rest] = state.discard;
  return { card: card!, discard: rest };
}

function pushDiscard(discard: readonly Card[], card: Card): Card[] {
  return [card, ...discard];
}

/** Pesca dal mazzo coperto e tiene la carta, sostituendo una posizione del proprio Deck. */
export function drawAndKeep(
  state: DrawState,
  grid: PlayerDeck,
  column: number,
  row: number,
  rng: () => number = Math.random,
): { grid: PlayerDeck; deck: Card[]; discard: Card[] } {
  const drawn = drawFromDeck(state, rng);
  const { grid: newGrid, discarded } = replaceCard(grid, column, row, drawn.card);
  return { grid: newGrid, deck: drawn.deck, discard: pushDiscard(drawn.discard, discarded) };
}

/** Pesca dal mazzo coperto, scarta subito la carta pescata e scopre una propria carta coperta. */
export function drawAndDiscard(
  state: DrawState,
  grid: PlayerDeck,
  column: number,
  row: number,
  rng: () => number = Math.random,
): { grid: PlayerDeck; deck: Card[]; discard: Card[] } {
  const drawn = drawFromDeck(state, rng);
  const newGrid = revealCoveredCard(grid, column, row);
  return { grid: newGrid, deck: drawn.deck, discard: pushDiscard(drawn.discard, drawn.card) };
}

/** Prende la carta in cima agli scarti e la usa obbligatoriamente per sostituire una posizione. */
export function takeDiscardAndReplace(
  state: DrawState,
  grid: PlayerDeck,
  column: number,
  row: number,
): { grid: PlayerDeck; discard: Card[] } {
  const taken = takeFromDiscard(state);
  const { grid: newGrid, discarded } = replaceCard(grid, column, row, taken.card);
  return { grid: newGrid, discard: pushDiscard(taken.discard, discarded) };
}

/** Guardia di validazione: la posizione scelta deve essere ancora coperta. */
export function assertCovered(grid: PlayerDeck, column: number, row: number): void {
  if (getSlot(grid, column, row).faceUp) {
    throw new Error(`La carta in riga ${row + 1} colonna ${column + 1} è già scoperta.`);
  }
}
