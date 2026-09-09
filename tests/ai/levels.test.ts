import { describe, expect, it } from "vitest";
import { DEFAULT_OPPONENT, OPPONENT_ROSTER, getLevelParams } from "../../src/ai/levels.js";

describe("OPPONENT_ROSTER", () => {
  it("contiene i nove avversari fissi con nome e livello dallo spec", () => {
    expect(OPPONENT_ROSTER).toHaveLength(9);
    const byName = Object.fromEntries(OPPONENT_ROSTER.map((p) => [p.name, p.level]));
    expect(byName).toEqual({
      Roberto: 5,
      Elena: 10,
      Lorenzo: 8,
      Martina: 9,
      Graziano: 2,
      Marco: 3,
      Roger: 1,
      Alessandro: 7,
      Aurora: 6,
    });
  });

  it("l'avversario di default è Roberto livello 5", () => {
    expect(DEFAULT_OPPONENT.name).toBe("Roberto");
    expect(DEFAULT_OPPONENT.level).toBe(5);
  });

  it("ogni avversario ha un id univoco", () => {
    const ids = new Set(OPPONENT_ROSTER.map((p) => p.id));
    expect(ids.size).toBe(OPPONENT_ROSTER.length);
  });
});

describe("getLevelParams", () => {
  it("livello 1: casualità alta, nessun conteggio carte, nessuna negazione, nessuna cautela in chiusura", () => {
    const p = getLevelParams(1);
    expect(p.randomness).toBeGreaterThan(0.6);
    expect(p.countingWeight).toBe(0);
    expect(p.denialWeight).toBe(0);
    expect(p.closingCaution).toBe(0);
  });

  it("livello 10: nessuna casualità, conteggio e negazione al massimo", () => {
    const p = getLevelParams(10);
    expect(p.randomness).toBe(0);
    expect(p.countingWeight).toBe(1);
    expect(p.denialWeight).toBe(1);
    expect(p.closingCaution).toBe(1);
  });

  it("i parametri sono monotoni lungo la scala 1-10", () => {
    const params = Array.from({ length: 10 }, (_, i) => getLevelParams((i + 1) as never));
    for (let i = 1; i < params.length; i += 1) {
      expect(params[i]!.randomness).toBeLessThanOrEqual(params[i - 1]!.randomness);
      expect(params[i]!.countingWeight).toBeGreaterThanOrEqual(params[i - 1]!.countingWeight);
      expect(params[i]!.denialWeight).toBeGreaterThanOrEqual(params[i - 1]!.denialWeight);
      expect(params[i]!.closingCaution).toBeGreaterThanOrEqual(params[i - 1]!.closingCaution);
    }
  });

  it("tutti i parametri restano entro [0, 1]", () => {
    for (let level = 1; level <= 10; level += 1) {
      const p = getLevelParams(level as never);
      for (const value of [p.randomness, p.countingWeight, p.denialWeight, p.closingCaution]) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    }
  });
});
