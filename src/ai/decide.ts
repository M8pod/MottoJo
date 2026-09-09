import { CARD_COUNTS } from "../engine/deck.js";
import type { CardValue, PlayerDeck } from "../engine/types.js";
import type { LevelParams, PublicGrid, PublicView } from "./types.js";

const TOTAL_CARDS = CARD_COUNTS.reduce((sum, [, count]) => sum + count, 0);

let staticAverageCache: number | null = null;
/** Valore medio delle 150 carte del mazzo, calcolato una sola volta dalla distribuzione ufficiale. */
function staticAverage(): number {
  if (staticAverageCache === null) {
    const sum = CARD_COUNTS.reduce((acc, [value, count]) => acc + value * count, 0);
    staticAverageCache = sum / TOTAL_CARDS;
  }
  return staticAverageCache;
}

/** Stima basata sul conteggio delle carte già viste: media delle carte ancora sconosciute. */
function countingBasedAverage(seenCounts: ReadonlyMap<CardValue, number>): number {
  let remainingCount = 0;
  let weightedSum = 0;
  for (const [value, total] of CARD_COUNTS) {
    const remaining = total - (seenCounts.get(value) ?? 0);
    remainingCount += remaining;
    weightedSum += value * remaining;
  }
  return remainingCount > 0 ? weightedSum / remainingCount : staticAverage();
}

/**
 * Valore atteso di una carta ancora sconosciuta (pescata alla cieca, o coperta
 * nella propria o altrui griglia). Sfuma dalla media statica del mazzo (nessun
 * conteggio, livelli bassi) alla stima basata sulle carte già viste (livelli
 * alti), secondo `params.countingWeight`.
 */
export function estimateUnseenValue(view: PublicView, params: LevelParams): number {
  const flat = staticAverage();
  const counted = countingBasedAverage(view.seenCounts);
  return flat + (counted - flat) * params.countingWeight;
}

function coveredPositions(grid: PlayerDeck): { column: number; row: number }[] {
  const positions: { column: number; row: number }[] = [];
  grid.forEach((column, c) => column.forEach((slot, r) => { if (!slot.faceUp) positions.push({ column: c, row: r }); }));
  return positions;
}

/** Nessuna informazione distingue due carte coperte: scelta uniforme, uguale a ogni livello. */
export function decideInitialReveal(grid: PlayerDeck, rng: () => number = Math.random): { column: number; row: number } {
  const covered = coveredPositions(grid);
  if (covered.length === 0) {
    throw new Error("Nessuna carta coperta da scoprire.");
  }
  return covered[Math.floor(rng() * covered.length)]!;
}

function countCovered(grid: PublicGrid): number {
  return grid.reduce((sum, col) => sum + col.filter((s) => !s.faceUp).length, 0);
}

function sumFaceUp(grid: PublicGrid): number {
  return grid.reduce(
    (sum, col) => sum + col.reduce((s, slot) => s + (slot.faceUp ? slot.value : 0), 0),
    0,
  );
}

/**
 * Colonna di un avversario con due carte scoperte già uguali al valore dato
 * e la terza ancora coperta: prendere quel valore dagli scarti gli negherebbe
 * l'annullamento della colonna.
 */
export function findDenialTarget(
  view: PublicView,
  value: CardValue,
): { opponentIndex: number; column: number } | null {
  for (const opponent of view.opponents) {
    for (let c = 0; c < opponent.grid.length; c += 1) {
      const column = opponent.grid[c]!;
      const faceUpMatching = column.filter((s) => s.faceUp && s.value === value);
      const hasCovered = column.some((s) => !s.faceUp);
      if (faceUpMatching.length === 2 && hasCovered) {
        return { opponentIndex: opponent.index, column: c };
      }
    }
  }
  return null;
}

/** Decide se pescare dal mazzo coperto o prendere la carta in cima agli scarti. */
export function decideDrawSource(
  view: PublicView,
  params: LevelParams,
  rng: () => number = Math.random,
): "deck" | "discard" {
  if (view.discardTop === null) {
    return "deck";
  }

  const estimate = estimateUnseenValue(view, params);
  const denialTarget = findDenialTarget(view, view.discardTop);
  const worthTakingForSelf = view.discardTop < estimate;
  const worthTakingForDenial = denialTarget !== null && rng() < params.denialWeight;
  const preferred: "deck" | "discard" = worthTakingForSelf || worthTakingForDenial ? "discard" : "deck";

  if (rng() < params.randomness) {
    return rng() < 0.5 ? "deck" : "discard";
  }
  return preferred;
}

interface Candidate {
  readonly column: number;
  readonly row: number;
  readonly gain: number;
  readonly wasCovered: boolean;
}

function rankCandidates(grid: PublicGrid, candidateValue: CardValue, estimate: number): Candidate[] {
  const candidates: Candidate[] = [];
  grid.forEach((col, c) =>
    col.forEach((slot, r) => {
      const comparison = slot.faceUp ? slot.value : estimate;
      candidates.push({ column: c, row: r, gain: comparison - candidateValue, wasCovered: !slot.faceUp });
    }),
  );
  return candidates.sort((a, b) => b.gain - a.gain);
}

function wouldFavorClosing(
  view: PublicView,
  candidateValue: CardValue,
  estimate: number,
): boolean {
  const selfCovered = countCovered(view.self.grid);
  const projectedSelfTotal = sumFaceUp(view.self.grid) + candidateValue + (selfCovered - 1) * estimate;

  if (view.opponents.length === 0) {
    return true;
  }
  const bestOpponentProjected = Math.min(
    ...view.opponents.map((o) => sumFaceUp(o.grid) + countCovered(o.grid) * estimate),
  );
  return projectedSelfTotal <= bestOpponentProjected;
}

/**
 * Sceglie la posizione dove piazzare `candidateValue`. Se `forced` è falso
 * (carta pescata dal mazzo coperto) e nessuna posizione offre un miglioramento
 * reale, restituisce `decline` (la carta va scartata subito, scoprendo una
 * propria carta coperta a caso). Se `forced` è vero (carta presa dagli
 * scarti) una posizione va sempre scelta.
 */
export function choosePlacement(
  view: PublicView,
  candidateValue: CardValue,
  params: LevelParams,
  rng: () => number = Math.random,
  options: { forced: boolean },
): { action: "place"; column: number; row: number } | { action: "decline" } {
  const grid = view.self.grid;
  const estimate = estimateUnseenValue(view, params);
  const ranked = rankCandidates(grid, candidateValue, estimate);

  if (!options.forced && ranked.every((c) => c.gain <= 0)) {
    if (rng() >= params.randomness) {
      return { action: "decline" };
    }
  }

  let choice: Candidate =
    rng() < params.randomness ? ranked[Math.floor(rng() * ranked.length)]! : ranked[0]!;

  const isLastCovered = choice.wasCovered && countCovered(grid) === 1;
  if (isLastCovered && rng() < params.closingCaution && !wouldFavorClosing(view, candidateValue, estimate)) {
    const alternative = ranked.find((c) => !(c.column === choice.column && c.row === choice.row));
    if (alternative) {
      choice = alternative;
    }
  }

  return { action: "place", column: choice.column, row: choice.row };
}

/** Esito di una carta pescata dal mazzo coperto, di valore già noto (appena pescata). */
export function decideDeckOutcome(
  view: PublicView,
  drawnValue: CardValue,
  params: LevelParams,
  rng: () => number = Math.random,
): { action: "keep"; column: number; row: number } | { action: "discard"; column: number; row: number } {
  const decision = choosePlacement(view, drawnValue, params, rng, { forced: false });
  if (decision.action === "place") {
    return { action: "keep", column: decision.column, row: decision.row };
  }

  const positions: { column: number; row: number }[] = [];
  view.self.grid.forEach((col, c) =>
    col.forEach((slot, r) => {
      if (!slot.faceUp) positions.push({ column: c, row: r });
    }),
  );
  const target = positions[Math.floor(rng() * positions.length)]!;
  return { action: "discard", column: target.column, row: target.row };
}

/** Posizione dove piazzare obbligatoriamente una carta presa dagli scarti. */
export function decideDiscardOutcome(
  view: PublicView,
  params: LevelParams,
  rng: () => number = Math.random,
): { column: number; row: number } {
  if (view.discardTop === null) {
    throw new Error("Non ci sono scarti da prendere.");
  }
  const decision = choosePlacement(view, view.discardTop, params, rng, { forced: true });
  if (decision.action !== "place") {
    throw new Error("Prendere dagli scarti obbliga sempre a una sostituzione.");
  }
  return { column: decision.column, row: decision.row };
}
