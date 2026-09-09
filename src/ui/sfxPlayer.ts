/**
 * Riproduzione dei 12 effetti sonori fissi (spec, sezione 4). A differenza
 * della voce narrante (`narrationPlayer.ts`), gli effetti sono brevi
 * "stinger" che non hanno bisogno di una coda seriale: si accavallano di
 * rado e, quando succede, non è un problema (a differenza del parlato, mai
 * sovrapposto). Non testato con vitest (solo `Audio` reale nel browser).
 */
import { assetUrl } from "../assetUrl.js";

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

export function createSfxPlayer(getVolume: () => number): SfxPlayer {
  return {
    play(name) {
      const volume = getVolume();
      if (volume <= 0) return;
      const audio = new Audio(sfxUrl(name));
      audio.volume = Math.min(1, Math.max(0, volume));
      void audio.play().catch(() => {
        // Riproduzione bloccata (es. nessuna interazione utente ancora avvenuta
        // nella pagina): non è un errore da segnalare, semplicemente quel
        // suono non parte questa volta.
      });
    },
  };
}
