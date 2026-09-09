import { describe, expect, it } from "vitest";
import {
  assertCovered,
  drawAndDiscard,
  drawAndKeep,
  drawFromDeck,
  takeDiscardAndReplace,
  takeFromDiscard,
  type DrawState,
} from "../src/engine/moves.js";
import { makeCard, makeGrid, seededRng } from "./helpers.js";

describe("drawFromDeck", () => {
  it("pesca la carta in cima al mazzo coperto", () => {
    const state: DrawState = { deck: [makeCard(3), makeCard(9)], discard: [] };
    const result = drawFromDeck(state);
    expect(result.card.value).toBe(3);
    expect(result.deck).toHaveLength(1);
  });

  it("rimescola gli scarti (tranne la cima) quando il mazzo coperto è vuoto", () => {
    const top = makeCard(7);
    const state: DrawState = {
      deck: [],
      discard: [top, makeCard(1), makeCard(2), makeCard(3)],
    };
    const result = drawFromDeck(state, seededRng(5));

    // Il nuovo mazzo pescato viene dal rimescolamento degli scarti (esclusa la cima).
    expect(result.deck.length + 1).toBe(3); // una carta pescata subito
    expect(result.discard).toEqual([top]);
  });

  it("lancia un errore se mazzo e scarti sono entrambi esauriti", () => {
    const state: DrawState = { deck: [], discard: [makeCard(4)] };
    expect(() => drawFromDeck(state)).toThrow();
  });
});

describe("takeFromDiscard", () => {
  it("prende la carta in cima agli scarti", () => {
    const state: DrawState = { deck: [], discard: [makeCard(2), makeCard(8)] };
    const result = takeFromDiscard(state);
    expect(result.card.value).toBe(2);
    expect(result.discard).toHaveLength(1);
  });

  it("lancia un errore se gli scarti sono vuoti", () => {
    const state: DrawState = { deck: [makeCard(1)], discard: [] };
    expect(() => takeFromDiscard(state)).toThrow();
  });
});

describe("drawAndKeep", () => {
  it("pesca dal mazzo, sostituisce una posizione e scarta la vecchia carta", () => {
    const grid = makeGrid([[1, 2, 3], [4, 5, 6]]);
    const state: DrawState = { deck: [makeCard(9)], discard: [] };
    const result = drawAndKeep(state, grid, 0, 1);

    expect(result.grid[0]![1]!.card.value).toBe(9);
    expect(result.grid[0]![1]!.faceUp).toBe(true);
    expect(result.discard[0]!.value).toBe(2);
    expect(result.deck).toHaveLength(0);
  });
});

describe("drawAndDiscard", () => {
  it("pesca dal mazzo, la scarta subito e scopre una propria carta coperta", () => {
    const grid = makeGrid([[1, 2, 3], [4, 5, 6]]);
    const state: DrawState = { deck: [makeCard(9)], discard: [] };
    const result = drawAndDiscard(state, grid, 1, 0);

    expect(result.grid[1]![0]!.faceUp).toBe(true);
    expect(result.grid[1]![0]!.card.value).toBe(4);
    expect(result.discard[0]!.value).toBe(9);
  });
});

describe("takeDiscardAndReplace", () => {
  it("prende dagli scarti e sostituisce obbligatoriamente una posizione", () => {
    const grid = makeGrid([[1, 2, 3], [4, 5, 6]]);
    const state: DrawState = { deck: [], discard: [makeCard(9), makeCard(0)] };
    const result = takeDiscardAndReplace(state, grid, 0, 0);

    expect(result.grid[0]![0]!.card.value).toBe(9);
    expect(result.discard[0]!.value).toBe(1);
    expect(result.discard).toHaveLength(2);
  });
});

describe("assertCovered", () => {
  it("non lancia errori su una carta coperta", () => {
    const grid = makeGrid([[1, 2, 3]]);
    expect(() => assertCovered(grid, 0, 0)).not.toThrow();
  });

  it("lancia un errore su una carta già scoperta", () => {
    const grid = makeGrid([[1, 2, 3]], true);
    expect(() => assertCovered(grid, 0, 0)).toThrow();
  });
});
