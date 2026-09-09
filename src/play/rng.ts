/**
 * PRNG seedabile e deterministico (mulberry32). Serve a rendere coerenti
 * "sbircia il valore che verrebbe pescato dal mazzo coperto" e "applica
 * davvero il pescaggio": senza questo, le due operazioni chiamerebbero
 * `drawFromDeck` in due momenti diversi, e nel caso raro in cui il mazzo
 * coperto è vuoto proprio in quel momento (rimescolamento degli scarti,
 * quindi consumo di casualità) potrebbero pescare due carte diverse.
 * Riseedando lo stesso valore per la seconda chiamata, il replay è identico.
 */
export function createSeededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
