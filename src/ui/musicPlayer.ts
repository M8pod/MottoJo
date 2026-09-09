/**
 * Musica di sottofondo (spec, sezione 6): un solo loop per la v1 (scelta
 * concordata con l'utente al posto delle "fino a tre tracce" originali).
 * Il volume si legge una volta sola all'avvio, non in continuo — stessa
 * convenzione già usata per narrazione ed effetti: un cambio dal volume
 * nell'Extra si sente dalla prossima volta che si entra in partita, non
 * serve tenerlo sincronizzato in tempo reale mentre suona (le due schermate
 * non sono mai visibili insieme). Non testato con vitest (solo `Audio`
 * reale nel browser).
 */
export interface MusicPlayer {
  start(): void;
  stop(): void;
}

export function createMusicPlayer(url: string, getVolume: () => number): MusicPlayer {
  let audio: HTMLAudioElement | null = null;

  return {
    start() {
      if (audio) return;
      const volume = getVolume();
      if (volume <= 0) return; // spec: 0 = musica disattivata del tutto, richiesta esplicita dell'utente.
      audio = new Audio(url);
      audio.loop = true;
      audio.volume = Math.min(1, Math.max(0, volume));
      void audio.play().catch(() => {
        // Riproduzione bloccata (nessuna interazione utente ancora avvenuta): non è un errore da segnalare.
      });
    },
    stop() {
      if (!audio) return;
      audio.pause();
      audio = null;
    },
  };
}
