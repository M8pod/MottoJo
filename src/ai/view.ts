import type { CardValue } from "../engine/types.js";
import type { PlayerDeck } from "../engine/types.js";
import type { RoundState } from "../state/types.js";
import type { PublicGrid, PublicView } from "./types.js";

export function toPublicGrid(grid: PlayerDeck): PublicGrid {
  return grid.map((column) =>
    column.map((slot) => (slot.faceUp ? { faceUp: true as const, value: slot.card.value } : { faceUp: false as const })),
  );
}

/**
 * Costruisce la vista pubblica del gioco per il giocatore `selfIndex`: mai il
 * valore di una carta coperta, propria o altrui. Il conteggio delle carte
 * viste somma le carte scoperte di tutti i giocatori e l'intera pila degli
 * scarti (che nel nostro modello di stato conserva la storia di ogni carta
 * scartata, non solo quella in cima).
 */
export function toPublicView(state: RoundState, selfIndex: number): PublicView {
  const self = { index: selfIndex, grid: toPublicGrid(state.players[selfIndex]!.grid) };
  const opponents = state.players
    .map((p, index) => ({ index, grid: toPublicGrid(p.grid) }))
    .filter((p) => p.index !== selfIndex);

  const seenCounts = new Map<CardValue, number>();
  const seeValue = (value: CardValue) => seenCounts.set(value, (seenCounts.get(value) ?? 0) + 1);

  for (const player of state.players) {
    for (const column of player.grid) {
      for (const slot of column) {
        if (slot.faceUp) seeValue(slot.card.value);
      }
    }
  }
  for (const card of state.discard) {
    seeValue(card.value);
  }

  return {
    self,
    opponents,
    discardTop: state.discard[0]?.value ?? null,
    deckSize: state.deck.length,
    seenCounts,
  };
}
