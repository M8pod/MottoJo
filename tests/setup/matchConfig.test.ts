import { describe, expect, it } from "vitest";
import { DEFAULT_OPPONENT, OPPONENT_ROSTER } from "../../src/ai/index.js";
import {
  MAX_OPPONENTS,
  MIN_OPPONENTS,
  defaultMatchConfig,
  isValidMatchConfig,
  loadLastMatchConfig,
  resolveOpponents,
  saveMatchConfig,
  setFastMatch,
  toggleOpponent,
  type ConfigStorage,
  type MatchConfig,
} from "../../src/setup/matchConfig.js";

function memoryStorage(): ConfigStorage {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => map.set(key, value),
  };
}

describe("defaultMatchConfig", () => {
  it("è un solo avversario, Roberto, livello 5 (spec, sezione 6)", () => {
    const config = defaultMatchConfig();
    expect(config.opponentIds).toEqual([DEFAULT_OPPONENT.id]);
    expect(DEFAULT_OPPONENT.name).toBe("Roberto");
    expect(DEFAULT_OPPONENT.level).toBe(5);
  });

  it("parte con la narrazione completa: 'Partita veloce' è una scelta da fare, non il default", () => {
    expect(defaultMatchConfig().fastMatch).toBe(false);
  });
});

describe("isValidMatchConfig", () => {
  it("accetta da 1 a 7 id noti, senza duplicati", () => {
    expect(isValidMatchConfig({ opponentIds: ["roberto"] })).toBe(true);
    expect(isValidMatchConfig({ opponentIds: OPPONENT_ROSTER.slice(0, 7).map((o) => o.id) })).toBe(true);
  });

  it("rifiuta zero avversari, più di sette, id sconosciuti o duplicati", () => {
    expect(isValidMatchConfig({ opponentIds: [] })).toBe(false);
    expect(isValidMatchConfig({ opponentIds: OPPONENT_ROSTER.map((o) => o.id) })).toBe(false); // 9 > MAX_OPPONENTS
    expect(isValidMatchConfig({ opponentIds: ["non-esiste"] })).toBe(false);
    expect(isValidMatchConfig({ opponentIds: ["roberto", "roberto"] })).toBe(false);
  });

  it("rifiuta valori non a forma di MatchConfig", () => {
    expect(isValidMatchConfig(null)).toBe(false);
    expect(isValidMatchConfig(undefined)).toBe(false);
    expect(isValidMatchConfig("roberto")).toBe(false);
    expect(isValidMatchConfig({})).toBe(false);
  });

  it("i limiti dichiarati corrispondono a quelli usati dalla validazione", () => {
    expect(MIN_OPPONENTS).toBe(1);
    expect(MAX_OPPONENTS).toBe(7);
  });
});

describe("resolveOpponents", () => {
  it("risolve gli id nell'ordine della configurazione, con nome e livello", () => {
    const config: MatchConfig = { opponentIds: ["roger", "roberto"], fastMatch: false };
    expect(resolveOpponents(config).map((o) => o.name)).toEqual(["Roger", "Roberto"]);
  });

  it("segnala un id sconosciuto invece di restituire un avversario inventato", () => {
    expect(() => resolveOpponents({ opponentIds: ["fantasma"], fastMatch: false })).toThrow();
  });
});

describe("loadLastMatchConfig / saveMatchConfig", () => {
  it("senza nulla di salvato restituisce il default", () => {
    expect(loadLastMatchConfig(memoryStorage())).toEqual(defaultMatchConfig());
  });

  it("fa il giro completo salvataggio → lettura", () => {
    const storage = memoryStorage();
    const config: MatchConfig = { opponentIds: ["elena", "aurora", "marco"], fastMatch: true };
    saveMatchConfig(storage, config);
    expect(loadLastMatchConfig(storage)).toEqual(config);
  });

  it("una configurazione salvata prima di 'Partita veloce' resta valida, col campo mancante a false", () => {
    const storage = memoryStorage();
    // Esattamente ciò che c'è nel localStorage di chi giocava già prima: gli
    // avversari scelti non vanno persi solo perché è comparso un campo nuovo.
    storage.setItem("motto-jo:last-match-config", JSON.stringify({ opponentIds: ["elena", "aurora"] }));
    expect(loadLastMatchConfig(storage)).toEqual({ opponentIds: ["elena", "aurora"], fastMatch: false });
  });

  it("con dati corrotti o non validi in memoria, ricade sul default invece di lanciare un errore", () => {
    const corrupted = memoryStorage();
    corrupted.setItem("motto-jo:last-match-config", "{non è json");
    expect(loadLastMatchConfig(corrupted)).toEqual(defaultMatchConfig());

    const invalid = memoryStorage();
    saveMatchConfig(invalid, { opponentIds: [] } as unknown as MatchConfig);
    expect(loadLastMatchConfig(invalid)).toEqual(defaultMatchConfig());
  });
});

describe("toggleOpponent", () => {
  it("aggiunge un avversario non selezionato", () => {
    const result = toggleOpponent({ opponentIds: ["roberto"], fastMatch: false }, "elena");
    expect(result).toEqual({ ok: true, config: { opponentIds: ["roberto", "elena"], fastMatch: false } });
  });

  it("rimuove un avversario già selezionato", () => {
    const result = toggleOpponent({ opponentIds: ["roberto", "elena"], fastMatch: false }, "roberto");
    expect(result).toEqual({ ok: true, config: { opponentIds: ["elena"], fastMatch: false } });
  });

  it("non perde la scelta 'Partita veloce' cambiando gli avversari", () => {
    const added = toggleOpponent({ opponentIds: ["roberto"], fastMatch: true }, "elena");
    expect(added).toEqual({ ok: true, config: { opponentIds: ["roberto", "elena"], fastMatch: true } });
    const removed = toggleOpponent({ opponentIds: ["roberto", "elena"], fastMatch: true }, "roberto");
    expect(removed).toEqual({ ok: true, config: { opponentIds: ["elena"], fastMatch: true } });
  });

  it("blocca la rimozione dell'ultimo avversario rimasto", () => {
    const result = toggleOpponent({ opponentIds: ["roberto"], fastMatch: false }, "roberto");
    expect(result).toEqual({ ok: false, reason: "min" });
  });

  it("blocca l'aggiunta oltre il massimo di sette", () => {
    const sevenIds = OPPONENT_ROSTER.slice(0, 7).map((o) => o.id);
    const eighth = OPPONENT_ROSTER[7]!.id;
    const result = toggleOpponent({ opponentIds: sevenIds, fastMatch: false }, eighth);
    expect(result).toEqual({ ok: false, reason: "max" });
  });
});

describe("setFastMatch", () => {
  it("spunta e toglie la spunta senza toccare gli avversari scelti", () => {
    const config: MatchConfig = { opponentIds: ["roberto", "elena"], fastMatch: false };
    const fast = setFastMatch(config, true);
    expect(fast).toEqual({ opponentIds: ["roberto", "elena"], fastMatch: true });
    expect(setFastMatch(fast, false)).toEqual(config);
  });
});
