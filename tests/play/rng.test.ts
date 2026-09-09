import { describe, expect, it } from "vitest";
import { createSeededRng } from "../../src/play/rng.js";

describe("createSeededRng", () => {
  it("stesso seed produce sempre la stessa sequenza", () => {
    const a = createSeededRng(42);
    const b = createSeededRng(42);
    const seqA = Array.from({ length: 10 }, () => a());
    const seqB = Array.from({ length: 10 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it("seed diversi producono sequenze diverse", () => {
    const a = createSeededRng(1);
    const b = createSeededRng(2);
    expect(a()).not.toBe(b());
  });

  it("restituisce sempre un numero in [0, 1)", () => {
    const rng = createSeededRng(7);
    for (let i = 0; i < 200; i += 1) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});
