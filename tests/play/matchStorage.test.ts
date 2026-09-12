import { describe, expect, it } from "vitest";
import { startMatch } from "../../src/play/match.js";
import {
  buildShareText,
  createSavedMatch,
  deleteMatch,
  getMatch,
  loadAllMatches,
  upsertMatch,
  type ConfigStorage,
} from "../../src/play/matchStorage.js";
import { seededRng } from "../helpers.js";

function memoryStorage(): ConfigStorage {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => map.set(key, value),
  };
}

describe("createSavedMatch / upsertMatch / getMatch / loadAllMatches", () => {
  it("crea, salva e ritrova una partita per id", () => {
    const storage = memoryStorage();
    const state = startMatch({ opponentIds: ["roberto"], fastMatch: false }, seededRng(1));
    const saved = createSavedMatch({ opponentIds: ["roberto"], fastMatch: false }, state);
    upsertMatch(storage, saved, state);

    const found = getMatch(storage, saved.id);
    expect(found?.id).toBe(saved.id);
    expect(found?.state.roundNumber).toBe(1);
  });

  it("elenca tutte le partite salvate, più recenti prima", async () => {
    const storage = memoryStorage();
    const stateA = startMatch({ opponentIds: ["roberto"], fastMatch: false }, seededRng(1));
    const savedA = createSavedMatch({ opponentIds: ["roberto"], fastMatch: false }, stateA);
    upsertMatch(storage, savedA, stateA);

    await new Promise((resolve) => setTimeout(resolve, 2));

    const stateB = startMatch({ opponentIds: ["elena"], fastMatch: false }, seededRng(2));
    const savedB = createSavedMatch({ opponentIds: ["elena"], fastMatch: false }, stateB);
    upsertMatch(storage, savedB, stateB);

    const all = loadAllMatches(storage);
    expect(all.map((m) => m.id)).toEqual([savedB.id, savedA.id]);
  });

  it("aggiorna updatedAt e lo stato con upsertMatch, senza cambiare id", () => {
    const storage = memoryStorage();
    const state = startMatch({ opponentIds: ["roberto"], fastMatch: false }, seededRng(1));
    const saved = createSavedMatch({ opponentIds: ["roberto"], fastMatch: false }, state);
    upsertMatch(storage, saved, state);

    const updatedState = { ...state, roundNumber: 2 };
    const updated = upsertMatch(storage, saved, updatedState);
    expect(updated.id).toBe(saved.id);
    expect(getMatch(storage, saved.id)?.state.roundNumber).toBe(2);
  });

  it("deleteMatch rimuove la partita", () => {
    const storage = memoryStorage();
    const state = startMatch({ opponentIds: ["roberto"], fastMatch: false }, seededRng(1));
    const saved = createSavedMatch({ opponentIds: ["roberto"], fastMatch: false }, state);
    upsertMatch(storage, saved, state);

    deleteMatch(storage, saved.id);
    expect(getMatch(storage, saved.id)).toBeUndefined();
    expect(loadAllMatches(storage)).toEqual([]);
  });

  it("con dati corrotti in memoria, ricade su un elenco vuoto invece di lanciare un errore", () => {
    const storage = memoryStorage();
    storage.setItem("motto-jo:saved-matches", "{non è json");
    expect(loadAllMatches(storage)).toEqual([]);
  });
});

describe("buildShareText", () => {
  it("elenca manche concluse, totale finora e non menziona ancora un vincitore se la partita è in corso", () => {
    const state = startMatch({ opponentIds: ["roberto"], fastMatch: false }, seededRng(1), "Marta");
    const withRoundScores = { ...state, roundScores: [[12, 20]], totals: [12, 20] };
    const saved = createSavedMatch({ opponentIds: ["roberto"], fastMatch: false }, withRoundScores);

    const text = buildShareText(saved);
    expect(text).toContain("Manche 1 — Marta: 12, Roberto: 20");
    expect(text).toContain("Totale finora — Marta: 12, Roberto: 20");
    expect(text).toContain("Manche 1 in corso.");
    expect(text).not.toContain("Vince");
  });

  it("annuncia il vincitore quando la partita è finita", () => {
    const state = startMatch({ opponentIds: ["roberto"], fastMatch: false }, seededRng(1), "Marta");
    const finished = { ...state, roundScores: [[100, 50]], totals: [100, 50], finished: true };
    const saved = createSavedMatch({ opponentIds: ["roberto"], fastMatch: false }, finished);

    const text = buildShareText(saved);
    expect(text).toContain("Totale finale — Marta: 100, Roberto: 50");
    expect(text).toContain("Vince Roberto.");
  });
});
