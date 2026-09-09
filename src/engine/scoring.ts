import type { PlayerDeck } from "./types.js";
import { scoreGrid } from "./grid.js";

export const GAME_OVER_THRESHOLD = 100;

/**
 * Determina chi inizia la prima manche: chi ha il totale più alto tra le
 * due carte scoperte iniziali. In caso di parità sul totale massimo, vince
 * l'indice più basso (scelta arbitraria ma deterministica).
 */
export function determineFirstRoundStarter(initialTotals: readonly number[]): number {
  if (initialTotals.length === 0) {
    throw new Error("Serve almeno un giocatore per determinare chi inizia.");
  }
  let starter = 0;
  for (let i = 1; i < initialTotals.length; i += 1) {
    if (initialTotals[i]! > initialTotals[starter]!) {
      starter = i;
    }
  }
  return starter;
}

export interface RoundResult {
  /** Punteggio di manche per ciascun giocatore, raddoppio già applicato. */
  readonly scores: readonly number[];
  /** True per il giocatore il cui punteggio è stato raddoppiato (al massimo uno: chi ha chiuso). */
  readonly doubled: readonly boolean[];
}

/**
 * Calcola i punteggi di fine manche. Se chi ha chiuso il turno non ha il
 * punteggio più basso in solitaria (un altro giocatore ha un punteggio
 * uguale o inferiore), il suo punteggio di manche viene raddoppiato.
 */
export function computeRoundScores(
  grids: readonly PlayerDeck[],
  closingPlayerIndex: number,
): RoundResult {
  if (closingPlayerIndex < 0 || closingPlayerIndex >= grids.length) {
    throw new Error(`Indice giocatore che chiude non valido: ${closingPlayerIndex}.`);
  }

  const rawScores = grids.map((grid) => scoreGrid(grid));
  const minScore = Math.min(...rawScores);
  const closerScore = rawScores[closingPlayerIndex]!;
  const isSoleLowest =
    closerScore === minScore && rawScores.filter((s) => s === minScore).length === 1;

  const scores = rawScores.map((score, i) =>
    i === closingPlayerIndex && !isSoleLowest ? score * 2 : score,
  );
  const doubled = rawScores.map((_, i) => i === closingPlayerIndex && !isSoleLowest);

  return { scores, doubled };
}

/** Somma i punteggi di manche ai totali di partita correnti. */
export function addRoundScores(
  totals: readonly number[],
  roundScores: readonly number[],
): number[] {
  if (totals.length !== roundScores.length) {
    throw new Error("Numero di giocatori incoerente tra totali e punteggi di manche.");
  }
  return totals.map((total, i) => total + roundScores[i]!);
}

/** La partita finisce quando qualcuno raggiunge o supera 100 punti totali. */
export function isGameOver(totals: readonly number[], threshold = GAME_OVER_THRESHOLD): boolean {
  return totals.some((total) => total >= threshold);
}

/** Indici dei vincitori (totale più basso; più di uno in caso di parità). */
export function getWinners(totals: readonly number[]): number[] {
  if (totals.length === 0) {
    return [];
  }
  const min = Math.min(...totals);
  return totals.reduce<number[]>((winners, total, i) => {
    if (total === min) winners.push(i);
    return winners;
  }, []);
}
