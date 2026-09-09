import { describe, expect, it } from "vitest";
import { createDeck, shuffle } from "../../src/engine/deck.js";
import {
  applyAction,
  createRoundState,
  getCurrentPlayerIndex,
  isRoundOver,
} from "../../src/state/round.js";
import type { RoundPlayer } from "../../src/state/types.js";
import { makeCard, makeGrid, seededRng } from "../helpers.js";
import { makeRoundState } from "./helpers.js";

function player(id: string, isHuman: boolean, grid: RoundPlayer["grid"]): RoundPlayer {
  return { id, name: id, isHuman, grid };
}

describe("createRoundState", () => {
  it("distribuisce 12 carte coperte a testa e apre gli scarti", () => {
    const stack = shuffle(createDeck(), seededRng(1));
    const state = createRoundState({
      roundNumber: 1,
      players: [
        { id: "a", name: "A", isHuman: true },
        { id: "b", name: "B", isHuman: false },
        { id: "c", name: "C", isHuman: false },
      ],
      shuffledStack: stack,
    });

    expect(state.players).toHaveLength(3);
    state.players.forEach((p) => {
      expect(p.grid).toHaveLength(4);
      p.grid.forEach((col) => col.forEach((slot) => expect(slot.faceUp).toBe(false)));
    });
    expect(state.discard).toHaveLength(1);
    expect(state.deck).toHaveLength(stack.length - 3 * 12 - 1);
    expect(state.phase).toBe("initial-reveal");
    expect(state.turnOrder).toBeNull();
  });

  it("richiede l'indice di chi ha chiuso la manche precedente dalla seconda manche in poi", () => {
    const stack = shuffle(createDeck(), seededRng(2));
    expect(() =>
      createRoundState({
        roundNumber: 2,
        players: [
          { id: "a", name: "A", isHuman: true },
          { id: "b", name: "B", isHuman: false },
        ],
        shuffledStack: stack,
      }),
    ).toThrow();
  });
});

describe("scoperta iniziale e determinazione di chi inizia", () => {
  it("manche 1: passa a 'playing' solo quando tutti hanno scoperto 2 carte, parte chi ha il totale più alto", () => {
    const a = player("a", false, makeGrid([[2, 6, 1]]));
    const b = player("b", true, makeGrid([[9, 9, 0]]));
    let state = makeRoundState([a, b], { phase: "initial-reveal", turnOrder: null, currentTurnIndex: -1 });

    state = applyAction(state, { type: "REVEAL_INITIAL_CARD", playerIndex: 0, column: 0, row: 0 });
    state = applyAction(state, { type: "REVEAL_INITIAL_CARD", playerIndex: 0, column: 0, row: 1 });
    expect(state.phase).toBe("initial-reveal");

    state = applyAction(state, { type: "REVEAL_INITIAL_CARD", playerIndex: 1, column: 0, row: 0 });
    state = applyAction(state, { type: "REVEAL_INITIAL_CARD", playerIndex: 1, column: 0, row: 1 });

    expect(state.phase).toBe("playing");
    expect(state.turnOrder).toEqual([1, 0]);
    expect(getCurrentPlayerIndex(state)).toBe(1);
    expect(state.history.some((e) => e.type === "handoff-to-human")).toBe(true);
  });

  it("manche successive: parte chi ha chiuso la manche precedente, a prescindere dai totali", () => {
    const a = player("a", false, makeGrid([[9, 9, 1]]));
    const b = player("b", false, makeGrid([[0, 0, 0]]));
    let state = makeRoundState([a, b], {
      roundNumber: 2,
      previousCloserIndex: 1,
      phase: "initial-reveal",
      turnOrder: null,
      currentTurnIndex: -1,
    });

    for (const playerIndex of [0, 1]) {
      state = applyAction(state, { type: "REVEAL_INITIAL_CARD", playerIndex, column: 0, row: 0 });
      state = applyAction(state, { type: "REVEAL_INITIAL_CARD", playerIndex, column: 0, row: 1 });
    }

    expect(state.turnOrder).toEqual([1, 0]);
  });

  it("lancia un errore se si scopre una terza carta iniziale", () => {
    const a = player("a", false, makeGrid([[1, 2, 3]], true));
    const state = makeRoundState([a], { phase: "initial-reveal", turnOrder: null, currentTurnIndex: -1 });
    expect(() =>
      applyAction(state, { type: "REVEAL_INITIAL_CARD", playerIndex: 0, column: 0, row: 2 }),
    ).toThrow();
  });
});

describe("DRAW_AND_KEEP", () => {
  it("pesca dal mazzo, sostituisce la posizione, scarta la vecchia carta e passa il turno", () => {
    const a = player("a", false, makeGrid([[5, 1, 2]], false));
    const b = player("b", true, makeGrid([[3, 4, 6]], false));
    const state = makeRoundState([a, b], {
      deck: [makeCard(9)],
      discard: [],
    });

    const next = applyAction(state, { type: "DRAW_AND_KEEP", column: 0, row: 0 });

    expect(next.players[0]!.grid[0]![0]!.card.value).toBe(9);
    expect(next.players[0]!.grid[0]![0]!.faceUp).toBe(true);
    expect(next.discard[0]!.value).toBe(5);
    expect(next.deck).toHaveLength(0);
    expect(getCurrentPlayerIndex(next)).toBe(1);

    const moveEvent = next.history.find((e) => e.type === "move");
    expect(moveEvent).toMatchObject({
      type: "move",
      source: "deck",
      action: "replace",
      playerIndex: 0,
      placedValue: 9,
      previous: { faceUp: false, value: 5 },
    });
    expect(next.history.some((e) => e.type === "handoff-to-human")).toBe(true);
  });
});

describe("DRAW_AND_DISCARD", () => {
  it("pesca dal mazzo, la scarta e scopre una propria carta coperta", () => {
    const a = player("a", false, makeGrid([[5, 1, 2]], false));
    const state = makeRoundState([a], { deck: [makeCard(9)], discard: [] });

    const next = applyAction(state, { type: "DRAW_AND_DISCARD", column: 0, row: 1 });

    expect(next.players[0]!.grid[0]![1]!.faceUp).toBe(true);
    expect(next.players[0]!.grid[0]![1]!.card.value).toBe(1);
    expect(next.discard[0]!.value).toBe(9);

    const moveEvent = next.history.find((e) => e.type === "move");
    expect(moveEvent).toMatchObject({
      type: "move",
      source: "deck",
      action: "discard",
      discardedValue: 9,
      revealedValue: 1,
    });
  });
});

describe("TAKE_DISCARD_AND_REPLACE", () => {
  it("prende dagli scarti e sostituisce obbligatoriamente una posizione", () => {
    const a = player("a", false, makeGrid([[5, 1, 2]], false));
    const state = makeRoundState([a], { deck: [], discard: [makeCard(9)] });

    const next = applyAction(state, { type: "TAKE_DISCARD_AND_REPLACE", column: 0, row: 0 });

    expect(next.players[0]!.grid[0]![0]!.card.value).toBe(9);
    expect(next.discard).toHaveLength(1);
    expect(next.discard[0]!.value).toBe(5);
  });

  it("lancia un errore se gli scarti sono vuoti", () => {
    const a = player("a", false, makeGrid([[5, 1, 2]], false));
    const state = makeRoundState([a], { deck: [], discard: [] });
    expect(() =>
      applyAction(state, { type: "TAKE_DISCARD_AND_REPLACE", column: 0, row: 0 }),
    ).toThrow();
  });
});

describe("regola colonna uguale durante una mossa", () => {
  it("annulla la colonna quando la terza carta scoperta forma il tris", () => {
    const a = player(
      "a",
      false,
      [
        [
          { card: makeCard(5), faceUp: true },
          { card: makeCard(5), faceUp: true },
          { card: makeCard(5), faceUp: false },
        ],
        ...makeGrid([[1, 2, 3]]),
      ],
    );
    const state = makeRoundState([a], { deck: [makeCard(8)], discard: [] });

    const next = applyAction(state, { type: "DRAW_AND_DISCARD", column: 0, row: 2 });

    expect(next.history.some((e) => e.type === "column-cleared" && e.column === 0 && e.value === 5)).toBe(
      true,
    );
    expect(next.players[0]!.grid).toHaveLength(1);
    expect(next.players[0]!.grid[0]!.map((s) => s.card.value)).toEqual([1, 2, 3]);
  });
});

describe("chiusura manche e ultimo turno per tutti gli altri", () => {
  it("passa a final-turn alla chiusura del primo giocatore, poi a round-over dopo l'ultimo turno altrui", () => {
    const a = player("a", false, [
      [
        { card: makeCard(5), faceUp: true },
        { card: makeCard(5), faceUp: true },
        { card: makeCard(7), faceUp: false },
      ],
    ]);
    const b = player("b", true, makeGrid([[1, 2, 3]], false));
    const state = makeRoundState([a, b], {
      turnOrder: [0, 1],
      currentTurnIndex: 0,
      deck: [makeCard(1), makeCard(2)],
      discard: [],
    });

    const afterClose = applyAction(state, { type: "DRAW_AND_DISCARD", column: 0, row: 2 });

    expect(afterClose.phase).toBe("final-turn");
    expect(afterClose.closingPlayerIndex).toBe(0);
    expect(afterClose.finalTurnsRemaining).toBe(1);
    expect(afterClose.history.some((e) => e.type === "round-closed" && e.playerIndex === 0)).toBe(true);
    expect(getCurrentPlayerIndex(afterClose)).toBe(1);

    const afterFinalTurn = applyAction(afterClose, { type: "DRAW_AND_KEEP", column: 0, row: 0 });

    expect(afterFinalTurn.phase).toBe("round-over");
    expect(isRoundOver(afterFinalTurn)).toBe(true);
    expect(getCurrentPlayerIndex(afterFinalTurn)).toBeNull();
  });
});

describe("guardie di fase", () => {
  it("non permette mosse di gioco prima che la scoperta iniziale sia completa", () => {
    const a = player("a", false, makeGrid([[1, 2, 3]]));
    const state = makeRoundState([a], { phase: "initial-reveal", turnOrder: null, currentTurnIndex: -1 });
    expect(() => applyAction(state, { type: "DRAW_AND_KEEP", column: 0, row: 0 })).toThrow();
  });
});
