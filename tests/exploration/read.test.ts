import { describe, expect, it } from "vitest";
import {
  announceListenTarget,
  announceScore,
  readColumn,
  readPosition,
  readRow,
  readWholeDeck,
} from "../../src/exploration/read.js";
import { renderTokens } from "../../src/narration/tokens.js";
import { grid } from "../ai/helpers.js";

describe("readPosition", () => {
  it("annuncia il valore di una carta scoperta", () => {
    const g = grid([[7]]);
    expect(renderTokens(readPosition(g, 0, 0))).toBe("Riga uno colonna uno: sette.");
  });

  it("annuncia 'coperta' senza mai il valore", () => {
    const g = grid([[undefined]]);
    const rendered = renderTokens(readPosition(g, 0, 0));
    expect(rendered).toBe("Riga uno colonna uno: coperta.");
  });

  it("lancia un errore per posizioni fuori range", () => {
    const g = grid([[1, 2, 3]]);
    expect(() => readPosition(g, 5, 0)).toThrow();
    expect(() => readPosition(g, 0, 9)).toThrow();
  });
});

describe("readRow", () => {
  it("legge tutte le colonne di una riga, coperte comprese", () => {
    const g = grid([[7], [undefined], [4], [10]]);
    expect(renderTokens(readRow(g, 0))).toBe(
      "Riga uno: colonna uno, sette, colonna due, coperta, colonna tre, quattro, colonna quattro, dieci.",
    );
  });
});

describe("readColumn", () => {
  it("legge tutte le righe di una colonna, coperte comprese", () => {
    const g = grid([[7, undefined, 4]]);
    expect(renderTokens(readColumn(g, 0))).toBe(
      "Colonna uno: riga uno, sette, riga due, coperta, riga tre, quattro.",
    );
  });
});

describe("readWholeDeck", () => {
  it("proprio Deck: intestazione self-referenziale, poi ogni riga", () => {
    const g = grid([[1, 2], [3, 4]]);
    const rendered = renderTokens(readWholeDeck(g, { kind: "self" }));
    expect(rendered.startsWith("Il tuo Deck.")).toBe(true);
    expect(rendered).toContain("Riga uno: colonna uno, uno, colonna due, tre.");
    expect(rendered).toContain("Riga due: colonna uno, due, colonna due, quattro.");
  });

  it("Deck di un avversario: intestazione col nome fisso", () => {
    const g = grid([[1]]);
    const rendered = renderTokens(readWholeDeck(g, { kind: "opponent", name: "Roberto" }));
    expect(rendered.startsWith("Deck di Roberto.")).toBe(true);
  });
});

describe("announceListenTarget", () => {
  it("proprio Deck", () => {
    expect(renderTokens(announceListenTarget({ kind: "self" }))).toBe("Ora ascolti il tuo Deck.");
  });

  it("Deck di un avversario", () => {
    expect(renderTokens(announceListenTarget({ kind: "opponent", name: "Elena" }))).toBe(
      "Ora ascolti Deck di Elena.",
    );
  });
});

describe("announceScore", () => {
  it("somma solo le carte scoperte, mai quelle coperte", () => {
    const g = grid([[5, undefined, 3]]);
    expect(renderTokens(announceScore(g, { kind: "self" }))).toBe(
      "Punti dalle tue carte scoperte: totale otto punti.",
    );
  });

  it("Deck di un avversario cita il suo nome fisso", () => {
    const g = grid([[10, 10]]);
    expect(renderTokens(announceScore(g, { kind: "opponent", name: "Martina" }))).toBe(
      "Punti dalle carte scoperte, Martina: totale venti punti.",
    );
  });

  it("una griglia interamente coperta somma zero", () => {
    const g = grid([[undefined, undefined]]);
    expect(renderTokens(announceScore(g, { kind: "self" }))).toBe(
      "Punti dalle tue carte scoperte: totale zero punti.",
    );
  });
});
