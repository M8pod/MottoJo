import { createGainControlledAudio, type GainControlledAudio } from "./webAudioGain.js";

/**
 * Musica di sottofondo (spec, sezione 6): un solo loop per la v1 (scelta
 * concordata con l'utente al posto delle "fino a tre tracce" originali).
 * Il volume si legge una volta sola all'avvio, non in continuo — stessa
 * convenzione già usata per narrazione ed effetti: un cambio dal volume
 * nell'Extra si sente dalla prossima volta che si entra in partita, non
 * serve tenerlo sincronizzato in tempo reale mentre suona (le due schermate
 * non sono mai visibili insieme).
 *
 * Il volume passa da un GainNode (`webAudioGain.ts`), non dalla proprietà
 * `volume` dell'elemento audio: su iOS Safari quella proprietà viene
 * ignorata di proposito da Apple, quindi il cursore "Musica di sottofondo"
 * in Extra non aveva alcun effetto reale lì (bug segnalato dall'utente — la
 * musica restava sempre allo stesso volume alto). Non testato con vitest
 * (solo `Audio` reale nel browser).
 */
export interface MusicPlayer {
  start(): void;
  stop(): void;
}

export function createMusicPlayer(url: string, getVolume: () => number): MusicPlayer {
  let controlled: GainControlledAudio | null = null;

  return {
    start() {
      if (controlled) return;
      const volume = getVolume();
      if (volume <= 0) return; // spec: 0 = musica disattivata del tutto, richiesta esplicita dell'utente.
      controlled = createGainControlledAudio();
      controlled.setVolume(volume);
      controlled.element.src = url;
      controlled.element.loop = true;
      void controlled.element.play().catch(() => {
        // Riproduzione bloccata (nessuna interazione utente ancora avvenuta): non è un errore da segnalare.
      });
    },
    stop() {
      if (!controlled) return;
      controlled.element.pause();
      controlled = null;
    },
  };
}
