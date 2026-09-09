import { describe, expect, it } from "vitest";
import { createDeck } from "../../src/engine/deck.js";
import { dealGrid, revealCoveredCard } from "../../src/engine/grid.js";
import { createRoundState } from "../../src/state/round.js";
import { toPublicGrid, toPublicView } from "../../src/ai/view.js";

describe("toPublicGrid", () => {
  it("redige il valore delle carte coperte", () => {
    const { grid } = dealGrid(createDeck());
    const revealed = revealCoveredCard(grid, 0, 0);
    const publicGrid = toPublicGrid(revealed);

    expect(publicGrid[0]![0]).toMatchObject({ faceUp: true });
    expect((publicGrid[0]![0] as { value: number }).value).toBe(revealed[0]![0]!.card.value);
    expect(publicGrid[0]![1]).toEqual({ faceUp: false });
    expect("value" in publicGrid[0]![1]!).toBe(false);
  });
});

describe("toPublicView", () => {
  it("non espone mai il valore di una carta coperta, propria o altrui", () => {
    const stack = createDeck();
    const state = createRoundState({
      roundNumber: 1,
      players: [
        { id: "a", name: "A", isHuman: true },
        { id: "b", name: "B", isHuman: false },
      ],
      shuffledStack: stack,
    });

    const view = toPublicView(state, 0);
    for (const col of view.self.grid) {
      for (const s of col) expect(s.faceUp).toBe(false);
    }
    for (const opponent of view.opponents) {
      for (const col of opponent.grid) {
        for (const s of col) expect(s.faceUp).toBe(false);
      }
    }
  });

  it("conta le carte viste tra griglie scoperte e intera pila scarti", () => {
    const stack = createDeck();
    let state = createRoundState({
      roundNumber: 1,
      players: [
        { id: "a", name: "A", isHuman: true },
        { id: "b", name: "B", isHuman: false },
      ],
      shuffledStack: stack,
    });

    const discardTopValue = state.discard[0]!.value;
    const view = toPublicView(state, 0);

    expect(view.seenCounts.get(discardTopValue)).toBeGreaterThanOrEqual(1);
    expect(view.discardTop).toBe(discardTopValue);
    expect(view.deckSize).toBe(state.deck.length);
  });

  it("discardTop è null quando gli scarti sono vuoti", () => {
    const stack = createDeck();
    const state = createRoundState({
      roundNumber: 1,
      players: [{ id: "a", name: "A", isHuman: true }],
      shuffledStack: stack,
    });
    const emptyDiscardState = { ...state, discard: [] };
    const view = toPublicView(emptyDiscardState, 0);
    expect(view.discardTop).toBeNull();
  });
});
