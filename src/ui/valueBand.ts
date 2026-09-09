/**
 * Fascia di colore per valore carta (spec, sezione 5): indicatore secondario
 * mai l'unico (il numero resta sempre l'informazione principale). Logica
 * pura, usata dalla UI per scegliere la classe CSS della cornice/pallino
 * colorato.
 */
export type ValueBand = "slate" | "ivory" | "green" | "gold" | "maroon";

export function valueBand(value: number): ValueBand {
  if (value <= -1) return "slate";
  if (value === 0) return "ivory";
  if (value <= 4) return "green";
  if (value <= 8) return "gold";
  return "maroon";
}
