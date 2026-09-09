import { describe, expect, it } from "vitest";
import { OPPONENT_ROSTER } from "../../src/ai/index.js";
import { difficultyBand } from "../../src/setup/difficulty.js";

describe("difficultyBand", () => {
  it("livelli 1-3 sono Facile", () => {
    expect(difficultyBand(1)).toBe("Facile");
    expect(difficultyBand(3)).toBe("Facile");
  });

  it("livelli 4-7 sono Medio", () => {
    expect(difficultyBand(4)).toBe("Medio");
    expect(difficultyBand(7)).toBe("Medio");
  });

  it("livelli 8-10 sono Difficile", () => {
    expect(difficultyBand(8)).toBe("Difficile");
    expect(difficultyBand(10)).toBe("Difficile");
  });

  it("ogni avversario del roster fisso ha una fascia definita", () => {
    for (const opponent of OPPONENT_ROSTER) {
      expect(["Facile", "Medio", "Difficile"]).toContain(difficultyBand(opponent.level));
    }
  });
});
