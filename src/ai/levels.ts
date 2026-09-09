import type { LevelNumber, LevelParams } from "./types.js";

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

/**
 * Scala 1-10 tra i due estremi descritti nello spec (sezione 2):
 * - livello 1: scelte quasi casuali, ignora probabilità e convenienze ovvie.
 * - livello 10: conteggio carte, negazione scarti agli avversari, criterio
 *   nel chiudere in base a quanto sono vicini gli altri.
 * I livelli intermedi interpolano linearmente questi quattro parametri,
 * ciascuno introdotto/sfumato con una propria soglia (il conteggio carte e
 * la negazione contano solo dai livelli medio-alti in su, coerente con
 * "livello 10" come unico caso esplicitamente descritto nello spec).
 */
export function getLevelParams(level: LevelNumber): LevelParams {
  return {
    level,
    randomness: clamp01(((10 - level) / 10) * 0.8),
    countingWeight: clamp01((level - 4) / 6),
    denialWeight: clamp01((level - 6) / 4),
    closingCaution: clamp01((level - 3) / 7),
  };
}

export interface OpponentProfile {
  readonly id: string;
  readonly name: string;
  readonly level: LevelNumber;
}

/** Pool fisso dei nove avversari, nome e livello non modificabili (spec, sezione 2). */
export const OPPONENT_ROSTER: readonly OpponentProfile[] = [
  { id: "roberto", name: "Roberto", level: 5 },
  { id: "elena", name: "Elena", level: 10 },
  { id: "lorenzo", name: "Lorenzo", level: 8 },
  { id: "martina", name: "Martina", level: 9 },
  { id: "graziano", name: "Graziano", level: 2 },
  { id: "marco", name: "Marco", level: 3 },
  { id: "roger", name: "Roger", level: 1 },
  { id: "alessandro", name: "Alessandro", level: 7 },
  { id: "aurora", name: "Aurora", level: 6 },
];

/** Avversario di default al primissimo avvio dell'app (spec, sezione 6). */
export const DEFAULT_OPPONENT: OpponentProfile = OPPONENT_ROSTER[0]!;
