import { describe, expect, it } from "vitest";
import { name, number, pause, score, text, renderTokens } from "../../src/narration/tokens.js";

describe("renderTokens", () => {
  it("unisce i token con spaziatura naturale e ripulisce la punteggiatura", () => {
    const sentence = renderTokens([
      name("Roberto"),
      text("fonte_mazzo"),
      pause(","),
      text("az_scarta"),
      number(7),
      pause("."),
    ]);
    expect(sentence).toBe("Roberto pesca dal mazzo, scarta un sette.");
  });

  it("i numeri negativi usano le parole dedicate", () => {
    expect(renderTokens([number(-2)])).toBe("Meno due");
  });

  it("i punteggi usano la composizione grammaticale, non la tabella carte", () => {
    expect(renderTokens([score(23)])).toBe("Ventitré");
  });
});
