import { describe, expect, it } from "vitest";
import { numberToWords } from "../../src/narration/numbers.js";

describe("numberToWords", () => {
  it.each([
    [0, "zero"],
    [5, "cinque"],
    [9, "nove"],
    [10, "dieci"],
    [17, "diciassette"],
    [19, "diciannove"],
    [20, "venti"],
    [21, "ventuno"],
    [23, "ventitré"],
    [28, "ventotto"],
    [30, "trenta"],
    [31, "trentuno"],
    [33, "trentatré"],
    [38, "trentotto"],
    [40, "quaranta"],
    [81, "ottantuno"],
    [88, "ottantotto"],
    [90, "novanta"],
    [99, "novantanove"],
    [100, "cento"],
    [101, "centouno"],
    [123, "centoventitré"],
    [-3, "meno tre"],
    [-21, "meno ventuno"],
  ])("%i -> %s", (n, expected) => {
    expect(numberToWords(n)).toBe(expected);
  });

  it("lancia un errore oltre le 999 unità o per valori non interi", () => {
    expect(() => numberToWords(1000)).toThrow();
    expect(() => numberToWords(1.5)).toThrow();
  });
});
