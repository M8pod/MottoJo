import { describe, expect, it } from "vitest";
import { createDeck } from "../src/engine/deck.js";
import {
  CARDS_PER_PLAYER,
  checkAndClearMatchingColumns,
  dealGrid,
  isGridComplete,
  replaceCard,
  revealCoveredCard,
  scoreGrid,
  sumFaceUpValues,
} from "../src/engine/grid.js";
import { makeCard, makeGrid } from "./helpers.js";

describe("dealGrid", () => {
  it("distribuisce 12 carte coperte in griglia 4x3", () => {
    const deck = createDeck();
    const { grid, remaining } = dealGrid(deck);

    expect(grid).toHaveLength(4);
    grid.forEach((column) => {
      expect(column).toHaveLength(3);
      column.forEach((slot) => expect(slot.faceUp).toBe(false));
    });
    expect(remaining).toHaveLength(deck.length - CARDS_PER_PLAYER);
  });

  it("lancia un errore se le carte non bastano", () => {
    expect(() => dealGrid(createDeck().slice(0, 5))).toThrow();
  });
});

describe("revealCoveredCard / replaceCard", () => {
  it("scopre una carta coperta senza cambiarla", () => {
    const grid = makeGrid([[1, 2, 3], [4, 5, 6], [7, 8, 9], [10, 11, 12]]);
    const revealed = revealCoveredCard(grid, 0, 0);
    expect(revealed[0]![0]!.faceUp).toBe(true);
    expect(revealed[0]![0]!.card.value).toBe(1);
  });

  it("lancia un errore se la carta è già scoperta", () => {
    const grid = makeGrid([[1, 2, 3], [4, 5, 6], [7, 8, 9], [10, 11, 12]], true);
    expect(() => revealCoveredCard(grid, 0, 0)).toThrow();
  });

  it("sostituisce una carta e restituisce quella scartata", () => {
    const grid = makeGrid([[1, 2, 3], [4, 5, 6], [7, 8, 9], [10, 11, 12]]);
    const newCard = makeCard(9);
    const { grid: next, discarded } = replaceCard(grid, 1, 2, newCard);

    expect(discarded.value).toBe(6);
    expect(next[1]![2]!.card.value).toBe(9);
    expect(next[1]![2]!.faceUp).toBe(true);
  });
});

describe("checkAndClearMatchingColumns", () => {
  it("rimuove una colonna con tre carte scoperte uguali e slitta le altre a sinistra", () => {
    const grid = makeGrid(
      [
        [5, 5, 5],
        [1, 2, 3],
        [4, 5, 6],
        [10, 11, 12],
      ],
      true,
    );
    const { grid: next, clearedColumns } = checkAndClearMatchingColumns(grid);

    expect(clearedColumns).toEqual([0]);
    expect(next).toHaveLength(3);
    expect(next[0]!.map((s) => s.card.value)).toEqual([1, 2, 3]);
    expect(next[1]!.map((s) => s.card.value)).toEqual([4, 5, 6]);
    expect(next[2]!.map((s) => s.card.value)).toEqual([10, 11, 12]);
  });

  it("non rimuove una colonna se una carta è ancora coperta, anche con valori uguali", () => {
    const grid: ReturnType<typeof makeGrid> = [
      [
        { card: { id: "a", value: 5 }, faceUp: true },
        { card: { id: "b", value: 5 }, faceUp: true },
        { card: { id: "c", value: 5 }, faceUp: false },
      ],
    ];
    const { grid: next, clearedColumns } = checkAndClearMatchingColumns(grid);
    expect(clearedColumns).toEqual([]);
    expect(next).toHaveLength(1);
  });

  it("non rimuove una colonna scoperta con valori diversi", () => {
    const grid = makeGrid([[1, 2, 3]], true);
    const { clearedColumns } = checkAndClearMatchingColumns(grid);
    expect(clearedColumns).toEqual([]);
  });

  it("rimuove più colonne contemporaneamente se entrambe soddisfano la regola", () => {
    const grid = makeGrid(
      [
        [7, 7, 7],
        [2, 2, 2],
        [1, 2, 3],
      ],
      true,
    );
    const { grid: next, clearedColumns } = checkAndClearMatchingColumns(grid);
    expect(clearedColumns).toEqual([0, 1]);
    expect(next).toHaveLength(1);
    expect(next[0]!.map((s) => s.card.value)).toEqual([1, 2, 3]);
  });
});

describe("isGridComplete", () => {
  it("è false se almeno una carta è coperta", () => {
    const grid = makeGrid([[1, 2, 3]], true);
    const withCovered = [[grid[0]![0]!, grid[0]![1]!, { ...grid[0]![2]!, faceUp: false }]];
    expect(isGridComplete(withCovered)).toBe(false);
  });

  it("è true se tutte le carte rimaste sono scoperte", () => {
    const grid = makeGrid([[1, 2, 3], [4, 5, 6]], true);
    expect(isGridComplete(grid)).toBe(true);
  });

  it("è true su un Deck ridotto da colonne annullate", () => {
    const { grid } = checkAndClearMatchingColumns(makeGrid([[5, 5, 5]], true));
    expect(grid).toHaveLength(0);
    expect(isGridComplete(grid)).toBe(true);
  });
});

describe("sumFaceUpValues vs scoreGrid", () => {
  it("sumFaceUpValues conta solo le carte scoperte, scoreGrid conta tutte", () => {
    const grid = makeGrid([[1, 2, 3], [4, 5, 6]]);
    const partiallyRevealed = revealCoveredCard(revealCoveredCard(grid, 0, 0), 1, 1);

    expect(sumFaceUpValues(partiallyRevealed)).toBe(1 + 5);
    expect(scoreGrid(partiallyRevealed)).toBe(1 + 2 + 3 + 4 + 5 + 6);
  });
});
