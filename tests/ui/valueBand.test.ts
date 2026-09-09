import { describe, expect, it } from "vitest";
import { valueBand } from "../../src/ui/valueBand.js";

describe("valueBand", () => {
  it("maps -2 and -1 to slate", () => {
    expect(valueBand(-2)).toBe("slate");
    expect(valueBand(-1)).toBe("slate");
  });

  it("maps 0 to ivory", () => {
    expect(valueBand(0)).toBe("ivory");
  });

  it("maps 1..4 to green", () => {
    expect(valueBand(1)).toBe("green");
    expect(valueBand(4)).toBe("green");
  });

  it("maps 5..8 to gold", () => {
    expect(valueBand(5)).toBe("gold");
    expect(valueBand(8)).toBe("gold");
  });

  it("maps 9..12 to maroon", () => {
    expect(valueBand(9)).toBe("maroon");
    expect(valueBand(12)).toBe("maroon");
  });
});
