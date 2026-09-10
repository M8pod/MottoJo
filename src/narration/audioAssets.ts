import { numberToWords } from "./numbers.js";
import type { NarrationToken } from "./tokens.js";
import type { PhraseKey } from "./fragments.js";
import { assetUrl } from "../assetUrl.js";

/** Estensione diversa da .mp3 per singoli frammenti (art_un: unico file rimasto in .wav, vedi motto-jo-frasi-narrazione.md). */
const CONNETTIVI_EXTENSION_OVERRIDES: Partial<Record<PhraseKey, string>> = {
  art_un: "wav",
};

/**
 * `motto_jo` ha 3 registrazioni scelte dall'utente dopo ascolto, invece
 * della singola registrazione di ogni altro frammento/frase: se ne sceglie
 * una a caso a ogni "colonna annullata" (vedi motto-jo-frasi-narrazione.md,
 * sezione 2), per non far sentire sempre la stessa esclamazione.
 */
export const MOTTO_JO_TAKES: readonly string[] = [
  assetUrl("assets/audio/frasi_fisse/motto_jo/gioooo__trionfante_risata.mp3"),
  assetUrl("assets/audio/frasi_fisse/motto_jo/jo__grido_entusiasta.mp3"),
  assetUrl("assets/audio/frasi_fisse/motto_jo/jo__trionfante_risata.mp3"),
];

/** Da parola italiana a chiave file: stessa convenzione usata per salvare i frammenti (accenti tolti, minuscolo). */
function slugForFilename(word: string): string {
  return word
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/ /g, "_");
}

export function numberAudioUrl(value: number): string {
  return assetUrl(`assets/audio/frammenti/numeri/num_${slugForFilename(numberToWords(value))}.mp3`);
}

export function nameAudioUrl(name: string): string {
  return assetUrl(`assets/audio/frammenti/nomi/nome_${slugForFilename(name)}.mp3`);
}

export function phraseAudioUrl(key: PhraseKey, rng: () => number = Math.random): string {
  if (key === "motto_jo") {
    return MOTTO_JO_TAKES[Math.floor(rng() * MOTTO_JO_TAKES.length)]!;
  }
  if (key === "tocca_a_te") {
    return assetUrl("assets/audio/frasi_fisse/tocca_a_te.mp3");
  }
  if (key === "invito_scopri_due") {
    return assetUrl("assets/audio/frasi_fisse/invito_scopri_due.mp3");
  }
  const ext = CONNETTIVI_EXTENSION_OVERRIDES[key] ?? "mp3";
  return assetUrl(`assets/audio/frammenti/connettivi/${key}.${ext}`);
}

/** null per una pausa: non è un frammento registrato, solo un breve silenzio da rispettare a runtime. */
export function tokenAudioUrl(token: NarrationToken, rng: () => number = Math.random): string | null {
  switch (token.kind) {
    case "name":
      return nameAudioUrl(token.name);
    case "number":
      return numberAudioUrl(token.value);
    case "score":
      return numberAudioUrl(token.value);
    case "text":
      return phraseAudioUrl(token.key, rng);
    case "pause":
      return null;
  }
}

/** Durata (ms) della pausa silenziosa per ogni segno: una breve cesura naturale tra frammenti incollati al volo. */
export function pauseDurationMs(mark: "." | "," | ":"): number {
  switch (mark) {
    case ",":
      return 150;
    case ":":
      return 250;
    case ".":
      return 450;
  }
}
