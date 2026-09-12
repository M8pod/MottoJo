import { pauseDurationMs, tokenAudioUrl } from "../narration/audioAssets.js";
import type { NarrationToken } from "../narration/tokens.js";
import { createGainControlledAudio, type GainControlledAudio } from "./webAudioGain.js";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Tempo massimo di attesa per un frammento prima di rinunciare e passare
 * oltre. Senza questo, un frammento che il browser non porta mai né a
 * "ended" né a "error" (osservato su sessioni di gioco lunghe, probabile
 * esaurimento dei decoder audio del browser) blocca la coda per sempre: il
 * bug segnalato dall'utente, "dopo un po' la voce del presentatore smette di
 * parlare". Il riuso dei due elementi qui sotto (invece di un `new Audio()`
 * per ogni frammento, come prima) riduce già molto la probabilità che
 * succeda, questo timeout è la rete di sicurezza per quando succede lo
 * stesso. */
const CLIP_TIMEOUT_MS = 8000;

function playOn(controlled: GainControlledAudio, volume: number, url: string): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      controlled.element.removeEventListener("ended", onEnded);
      controlled.element.removeEventListener("error", onError);
      window.clearTimeout(timeoutId);
      resolve();
    };
    const onEnded = () => finish();
    const onError = () => {
      console.warn(`Frammento audio non riproducibile: ${url}`);
      finish();
    };
    const timeoutId = window.setTimeout(finish, CLIP_TIMEOUT_MS);
    controlled.element.addEventListener("ended", onEnded);
    controlled.element.addEventListener("error", onError);
    controlled.setVolume(volume);
    void controlled.element.play().catch(onError);
  });
}

type NarrationStep = { readonly kind: "clip"; readonly url: string } | { readonly kind: "pause"; readonly ms: number };

function toSteps(tokens: readonly NarrationToken[]): NarrationStep[] {
  const steps: NarrationStep[] = [];
  for (const token of tokens) {
    if (token.kind === "pause") {
      steps.push({ kind: "pause", ms: pauseDurationMs(token.mark) });
      continue;
    }
    const url = tokenAudioUrl(token);
    if (url) steps.push({ kind: "clip", url });
  }
  return steps;
}

function nextClipUrl(steps: readonly NarrationStep[], from: number): string | null {
  for (let i = from; i < steps.length; i += 1) {
    const step = steps[i]!;
    if (step.kind === "clip") return step.url;
  }
  return null;
}

export interface NarrationPlayer {
  /** Accoda una frase (elenco di token) da recitare: incolla i frammenti audio veri in sequenza, con pause tra un pezzo e l'altro. */
  enqueue(tokens: readonly NarrationToken[]): void;
  /** Svuota le frasi ancora in coda (non interrompe il frammento eventualmente già in riproduzione). */
  clear(): void;
  /**
   * Accoda una funzione invece di una frase: viene richiamata solo dopo che
   * tutte le frasi accodate PRIMA di questa chiamata sono finite di
   * riprodursi (stessa idea di `LimbAnimator.runAfterQueue`). Usato per
   * riabilitare i controlli di turno solo a narrazione davvero conclusa, non
   * appena lo stato di gioco è cambiato — altrimenti chi vede può già agire
   * mentre il narratore sta ancora raccontando i turni IA precedenti (spec,
   * bug segnalato dopo la prova utente con più avversari).
   */
  runAfterQueue(fn: () => void): void;
}

/**
 * Motore di riproduzione della voce narrante (ultimo pezzo del punto 4 dello
 * spec, "collegamento alla sintesi vocale di sistema"): una coda seriale, mai
 * sovrapposta, così più frasi accodate una dopo l'altra (es. una raffica di
 * turni IA prima che torni il turno umano) si sentono nell'ordine giusto
 * invece che accavallarsi. `getVolume` è letto a ogni frammento (non solo
 * alla creazione) così un cambio del volume nell'Extra si sente dalla
 * prossima partita senza dover ricreare il player.
 *
 * Due elementi audio alternati, creati una volta sola e riusati per tutta la
 * partita (invece di uno nuovo per frammento): mentre il primo sta ancora
 * suonando, il secondo viene già caricato col frammento successivo, così
 * quando il primo finisce il secondo può partire subito invece di aspettare
 * rete/decodifica — i "momenti di vuoto" tra frammenti incollati segnalati
 * dall'utente. Riusare solo due elementi invece di crearne sempre di nuovi
 * evita anche di esaurire i decoder audio del browser su una partita lunga
 * (vedi CLIP_TIMEOUT_MS sopra).
 */
type QueueItem =
  | { readonly kind: "phrase"; readonly tokens: readonly NarrationToken[] }
  | { readonly kind: "callback"; readonly fn: () => void };

export function createNarrationPlayer(getVolume: () => number = () => 1): NarrationPlayer {
  const queue: QueueItem[] = [];
  let running = false;
  const players: [GainControlledAudio, GainControlledAudio] = [createGainControlledAudio(), createGainControlledAudio()];
  let activeIndex = 0;

  async function playTokens(tokens: readonly NarrationToken[]): Promise<void> {
    const steps = toSteps(tokens);
    const firstUrl = nextClipUrl(steps, 0);
    if (firstUrl) {
      const preload = players[activeIndex]!.element;
      preload.src = firstUrl;
      preload.load();
    }
    for (let i = 0; i < steps.length; i += 1) {
      const step = steps[i]!;
      if (step.kind === "pause") {
        await sleep(step.ms);
        continue;
      }
      const controlled = players[activeIndex]!;
      activeIndex = activeIndex === 0 ? 1 : 0;
      const upcoming = nextClipUrl(steps, i + 1);
      if (upcoming) {
        const preload = players[activeIndex]!.element;
        preload.src = upcoming;
        preload.load();
      }
      await playOn(controlled, getVolume(), step.url);
    }
  }

  async function drain(): Promise<void> {
    if (running) return;
    running = true;
    while (queue.length > 0) {
      const next = queue.shift()!;
      if (next.kind === "callback") {
        next.fn();
      } else {
        await playTokens(next.tokens);
      }
    }
    running = false;
  }

  return {
    enqueue(tokens) {
      queue.push({ kind: "phrase", tokens });
      void drain();
    },
    clear() {
      queue.length = 0;
    },
    runAfterQueue(fn) {
      if (queue.length === 0 && !running) {
        fn();
        return;
      }
      queue.push({ kind: "callback", fn });
      void drain();
    },
  };
}
