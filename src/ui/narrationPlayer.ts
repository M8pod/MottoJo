import { pauseDurationMs, tokenAudioUrl } from "../narration/audioAssets.js";
import type { NarrationToken } from "../narration/tokens.js";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function playClip(url: string, volume: number): Promise<void> {
  return new Promise((resolve) => {
    const audio = new Audio(url);
    audio.volume = Math.min(1, Math.max(0, volume));
    const done = () => {
      audio.removeEventListener("ended", done);
      audio.removeEventListener("error", onError);
      resolve();
    };
    const onError = () => {
      console.warn(`Frammento audio non riproducibile: ${url}`);
      done();
    };
    audio.addEventListener("ended", done);
    audio.addEventListener("error", onError);
    void audio.play().catch(onError);
  });
}

async function playTokens(tokens: readonly NarrationToken[], getVolume: () => number): Promise<void> {
  for (const token of tokens) {
    if (token.kind === "pause") {
      await sleep(pauseDurationMs(token.mark));
      continue;
    }
    const url = tokenAudioUrl(token);
    if (url) await playClip(url, getVolume());
  }
}

export interface NarrationPlayer {
  /** Accoda una frase (elenco di token) da recitare: incolla i frammenti audio veri in sequenza, con pause tra un pezzo e l'altro. */
  enqueue(tokens: readonly NarrationToken[]): void;
  /** Svuota le frasi ancora in coda (non interrompe il frammento eventualmente già in riproduzione). */
  clear(): void;
}

/**
 * Motore di riproduzione della voce narrante (ultimo pezzo del punto 4 dello
 * spec, "collegamento alla sintesi vocale di sistema"): una coda seriale, mai
 * sovrapposta, così più frasi accodate una dopo l'altra (es. una raffica di
 * turni IA prima che torni il turno umano) si sentono nell'ordine giusto
 * invece che accavallarsi. `getVolume` è letto a ogni frammento (non solo
 * alla creazione) così un cambio del volume nell'Extra si sente dalla
 * prossima partita senza dover ricreare il player.
 */
export function createNarrationPlayer(getVolume: () => number = () => 1): NarrationPlayer {
  const queue: (readonly NarrationToken[])[] = [];
  let running = false;

  async function drain(): Promise<void> {
    if (running) return;
    running = true;
    while (queue.length > 0) {
      const next = queue.shift()!;
      await playTokens(next, getVolume);
    }
    running = false;
  }

  return {
    enqueue(tokens) {
      queue.push(tokens);
      void drain();
    },
    clear() {
      queue.length = 0;
    },
  };
}
