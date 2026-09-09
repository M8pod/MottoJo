import type { LevelNumber } from "../ai/index.js";

export type DifficultyBand = "Facile" | "Medio" | "Difficile";

/** Fascia di difficoltà dichiarata accanto al nome nella lista avversari (spec, sezione 6). */
export function difficultyBand(level: LevelNumber): DifficultyBand {
  if (level <= 3) return "Facile";
  if (level <= 7) return "Medio";
  return "Difficile";
}
