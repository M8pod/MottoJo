import type { PublicGrid } from "../ai/types.js";
import type { CardValue } from "../engine/types.js";
import { narrateScoreQuery } from "../narration/narrate.js";
import { joinWithPause, name, number, pause, renderTokens, text, type NarrationToken } from "../narration/tokens.js";
import type { DeckListener } from "./types.js";

/**
 * Riga/colonna sono 0-based nel motore, 1-based nella narrazione ("riga due
 * colonna uno"). Righe (0-2) e colonne (0-3) restano sempre entro il range
 * di CardValue, quindi la conversione è sicura.
 */
const spoken = (zeroBased: number): CardValue => (zeroBased + 1) as CardValue;

function assertColumn(grid: PublicGrid, column: number): void {
  if (column < 0 || column >= grid.length) {
    throw new Error(`Colonna ${column} non valida: il Deck ha ${grid.length} colonne.`);
  }
}

function rowCount(grid: PublicGrid): number {
  return grid[0]?.length ?? 0;
}

function assertRow(grid: PublicGrid, row: number): void {
  const rows = rowCount(grid);
  if (row < 0 || row >= rows) {
    throw new Error(`Riga ${row} non valida: il Deck ha ${rows} righe.`);
  }
}

function valueOrCoperta(slot: PublicGrid[number][number]): NarrationToken[] {
  return slot.faceUp ? [number(slot.value)] : [text("coperta")];
}

function headerFor(listener: DeckListener): NarrationToken[] {
  return listener.kind === "self" ? [text("il_tuo_deck")] : [text("deck_di"), name(listener.name)];
}

/** Esplorazione tattile: valore (o "coperta") di una singola posizione. */
export function readPosition(grid: PublicGrid, column: number, row: number): NarrationToken[] {
  assertColumn(grid, column);
  assertRow(grid, row);
  const slot = grid[column]![row]!;
  return [
    text("pos_riga"),
    number(spoken(row)),
    text("pos_colonna"),
    number(spoken(column)),
    pause(":"),
    ...valueOrCoperta(slot),
    pause("."),
  ];
}

/** Pulsante "Leggi una riga": tutte le colonne di quella riga, da sinistra a destra. */
export function readRow(grid: PublicGrid, row: number): NarrationToken[] {
  assertRow(grid, row);
  const columnGroups = grid.map((column, c) => [
    text("pos_colonna"),
    number(spoken(c)),
    pause(","),
    ...valueOrCoperta(column[row]!),
  ]);
  return [
    text("pos_riga"),
    number(spoken(row)),
    pause(":"),
    ...joinWithPause(columnGroups, ","),
    pause("."),
  ];
}

/** Pulsante "Leggi una colonna": tutte le righe di quella colonna, dall'alto in basso. */
export function readColumn(grid: PublicGrid, column: number): NarrationToken[] {
  assertColumn(grid, column);
  const rows = rowCount(grid);
  const rowGroups = Array.from({ length: rows }, (_, r) => [
    text("pos_riga"),
    number(spoken(r)),
    pause(","),
    ...valueOrCoperta(grid[column]![r]!),
  ]);
  return [
    text("pos_colonna"),
    number(spoken(column)),
    pause(":"),
    ...joinWithPause(rowGroups, ","),
    pause("."),
  ];
}

/** Pulsante "Leggi l'intero Deck in ascolto": intestazione, poi ogni riga in sequenza. */
export function readWholeDeck(grid: PublicGrid, listener: DeckListener): NarrationToken[] {
  const header = [...headerFor(listener), pause(".")];
  const rows = Array.from({ length: rowCount(grid) }, (_, r) => readRow(grid, r));
  return [...header, ...rows.flat()];
}

/** Pulsante "Cambia Deck in ascolto": annuncia chi si sta ascoltando ora. */
export function announceListenTarget(listener: DeckListener): NarrationToken[] {
  return [text("ora_ascolti"), ...headerFor(listener), pause(".")];
}

/** Pulsante "Somma punti": solo le carte scoperte del Deck in ascolto, mai il punteggio finale. */
export function announceScore(grid: PublicGrid, listener: DeckListener): NarrationToken[] {
  const total = grid.reduce(
    (sum, column) => sum + column.reduce((s, slot) => s + (slot.faceUp ? slot.value : 0), 0),
    0,
  );
  return narrateScoreQuery(listener.kind === "self" ? null : listener.name, total);
}

export { renderTokens };
