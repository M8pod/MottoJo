/**
 * Instrada un elemento <audio> attraverso un GainNode della Web Audio API
 * invece di affidarsi a `HTMLMediaElement.volume`: su iOS Safari quella
 * proprietà viene ignorata di proposito da Apple (il volume reale resta
 * riservato ai tasti fisici del dispositivo) — qualunque cursore impostato
 * in Extra non aveva quindi alcun effetto reale sul suono, il bug segnalato
 * dall'utente ("i selettori del volume non funzionano"). Un GainNode invece
 * cambia davvero l'ampiezza del segnale, ovunque.
 *
 * Un solo `AudioContext` condiviso per tutta l'app: crearne uno per elemento
 * sarebbe overhead inutile, e i browser comunque ne limitano il numero.
 */

type AudioContextCtor = new () => AudioContext;

function resolveAudioContextCtor(): AudioContextCtor {
  const withWebkit = window as unknown as { webkitAudioContext?: AudioContextCtor };
  const ctor = window.AudioContext ?? withWebkit.webkitAudioContext;
  if (!ctor) throw new Error("Web Audio API non disponibile in questo browser.");
  return ctor;
}

let sharedContext: AudioContext | null = null;

/** Un `AudioContext` nasce sospeso finché non arriva un'interazione utente
 * vera: qui si tenta comunque `resume()` a ogni accesso, così basta la prima
 * pressione/tocco che porta a creare un suono (pescare, aprire Extra...)
 * perché riparta, senza dover cablare un listener globale dedicato. */
function getSharedContext(): AudioContext {
  if (!sharedContext) sharedContext = new (resolveAudioContextCtor())();
  if (sharedContext.state === "suspended") void sharedContext.resume();
  return sharedContext;
}

export interface GainControlledAudio {
  readonly element: HTMLAudioElement;
  setVolume(volume: number): void;
}

/** Crea un `<audio>` già collegato a un suo GainNode indipendente (0-1). */
export function createGainControlledAudio(): GainControlledAudio {
  const element = new Audio();
  const context = getSharedContext();
  const source = context.createMediaElementSource(element);
  const gain = context.createGain();
  source.connect(gain).connect(context.destination);
  return {
    element,
    setVolume(volume) {
      gain.gain.value = Math.min(1, Math.max(0, volume));
    },
  };
}
