/**
 * Riproduzione dei 12 effetti sonori fissi (spec, sezione 4). A differenza
 * della voce narrante (`narrationPlayer.ts`), gli effetti sono brevi
 * "stinger" che non hanno bisogno di una coda seriale: si accavallano di
 * rado e, quando succede, non è un problema (a differenza del parlato, mai
 * sovrapposto). Non testato con vitest (solo `Audio` reale nel browser).
 */
import { assetUrl } from "../assetUrl.js";
import { createGainControlledAudio, type GainControlledAudio } from "./webAudioGain.js";

export type SfxName =
  | "mescolio"
  | "disposizione"
  | "pesca_mazzo"
  | "presa_scarti"
  | "scarto"
  | "colonna_fanfara"
  | "ultimo_turno"
  | "vittoria_manche"
  | "vittoria_partita"
  | "sconfitta"
  | "cambio_deck"
  | "passaggio_mano";

function sfxUrl(name: SfxName): string {
  return assetUrl(`assets/audio/effetti/${name}.mp3`);
}

export interface SfxPlayer {
  play(name: SfxName): void;
}

/** Pool di pochi elementi audio riusati a turno, invece di un `new Audio()`
 * per ogni suono: su una partita lunga, con effetti che suonano a ogni mossa,
 * centinaia di elementi mai riutilizzati finivano per esaurire i decoder
 * audio del browser (stesso bug, per lo stesso motivo, che ammutoliva la
 * voce narrante — vedi narrationPlayer.ts). Un pool piccolo basta perché al
 * massimo pochi suoni sono davvero simultanei. */
const POOL_SIZE = 6;

export function createSfxPlayer(getVolume: () => number): SfxPlayer {
  const pool: GainControlledAudio[] = Array.from({ length: POOL_SIZE }, () => createGainControlledAudio());
  let next = 0;

  return {
    play(name) {
      const volume = getVolume();
      if (volume <= 0) return;
      const controlled = pool[next]!;
      next = (next + 1) % pool.length;
      controlled.setVolume(volume);
      controlled.element.src = sfxUrl(name);
      void controlled.element.play().catch(() => {
        // Riproduzione bloccata (es. nessuna interazione utente ancora avvenuta
        // nella pagina): non è un errore da segnalare, semplicemente quel
        // suono non parte questa volta.
      });
    },
  };
}
