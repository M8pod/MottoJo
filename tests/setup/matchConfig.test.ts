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
    const config: MatchConfig = { opponentIds: ["roger", "roberto"] };
    expect(resolveOpponents(config).map((o) => o.name)).toEqual(["Roger", "Roberto"]);
  });

  it("segnala un id sconosciuto invece di restituire un avversario inventato", () => {
    expect(() => resolveOpponents({ opponentIds: ["fantasma"] })).toThrow();
  });
});

describe("loadLastMatchConfig / saveMatchConfig", () => {
  it("senza nulla di salvato restituisce il default", () => {
    expect(loadLastMatchConfig(memoryStorage())).toEqual(defaultMatchConfig());
  });

  it("fa il giro completo salvataggio → lettura", () => {
    const storage = memoryStorage();
    const config: MatchConfig = { opponentIds: ["elena", "aurora", "marco"] };
    saveMatchConfig(storage, config);
    expect(loadLastMatchConfig(storage)).toEqual(config);
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
    const result = toggleOpponent({ opponentIds: ["roberto"] }, "elena");
    expect(result).toEqual({ ok: true, config: { opponentIds: ["roberto", "elena"] } });
  });

  it("rimuove un avversario già selezionato", () => {
    const result = toggleOpponent({ opponentIds: ["roberto", "elena"] }, "roberto");
    expect(result).toEqual({ ok: true, config: { opponentIds: ["elena"] } });
  });

  it("blocca la rimozione dell'ultimo avversario rimasto", () => {
    const result = toggleOpponent({ opponentIds: ["roberto"] }, "roberto");
    expect(result).toEqual({ ok: false, reason: "min" });
  });

  it("blocca l'aggiunta oltre il massimo di sette", () => {
    const sevenIds = OPPONENT_ROSTER.slice(0, 7).map((o) => o.id);
    const eighth = OPPONENT_ROSTER[7]!.id;
    const result = toggleOpponent({ opponentIds: sevenIds }, eighth);
    expect(result).toEqual({ ok: false, reason: "max" });
  });
});
