import type { CardValue } from "../engine/types.js";
import { NUMBER_WORDS, PHRASES, type PhraseKey } from "./fragments.js";
import { numberToWords } from "./numbers.js";

export type NarrationToken =
  | { readonly kind: "name"; readonly name: string }
  | { readonly kind: "number"; readonly value: CardValue }
  /** Punteggio (somma): intervallo aperto, parola composta — vedi numbers.ts. */
  | { readonly kind: "score"; readonly value: number }
  | { readonly kind: "text"; readonly key: PhraseKey }
  /**
   * Pausa tra due frasi/clausole: non è un frammento da registrare, ma
   * l'indicazione (per il lettore audio) di un breve silenzio — nel
   * fallback testuale diventa semplicemente il segno di punteggiatura.
   */
  | { readonly kind: "pause"; readonly mark: "." | "," | ":" };

export const name = (name: string): NarrationToken => ({ kind: "name", name });
export const number = (value: CardValue): NarrationToken => ({ kind: "number", value });
export const score = (value: number): NarrationToken => ({ kind: "score", value });
export const text = (key: PhraseKey): NarrationToken => ({ kind: "text", key });
export const pause = (mark: "." | "," | ":"): NarrationToken => ({ kind: "pause", mark });

function renderToken(token: NarrationToken): string {
  switch (token.kind) {
    case "name":
      return token.name;
    case "number":
      return NUMBER_WORDS[token.value];
    case "score":
      return numberToWords(token.value);
    case "text":
      return PHRASES[token.key];
    case "pause":
      return token.mark;
  }
}

/** Concatena più gruppi di token intervallandoli con una pausa (mai dopo l'ultimo). */
export function joinWithPause(
  groups: readonly (readonly NarrationToken[])[],
  mark: "." | "," | ":",
): NarrationToken[] {
  const result: NarrationToken[] = [];
  groups.forEach((group, i) => {
    if (i > 0) result.push(pause(mark));
    result.push(...group);
  });
  return result;
}

/**
 * Fallback testuale (debug, test, sottotitoli): unisce i token in una frase
 * leggibile. Alcuni frammenti (es. "riga") sono scritti minuscoli perché
 * ricorrono anche a metà frase: la maiuscola a inizio frase si applica solo
 * qui, sul risultato finale (a ogni punto, non solo il primo), e non è
 * rilevante per l'audio.
 */
export function renderTokens(tokens: readonly NarrationToken[]): string {
  const sentence = tokens
    .map(renderToken)
    .join(" ")
    .replace(/\s+([.,:])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  return sentence.replace(/(^|[.!]\s+)([a-zà-ÿ])/g, (_, sep: string, letter: string) => sep + letter.toUpperCase());
}
