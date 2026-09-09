import { describe, expect, it } from "vitest";
import { getLevelParams } from "../../src/ai/levels.js";
import {
  choosePlacement,
  decideDeckOutcome,
  decideDiscardOutcome,
  decideDrawSource,
  decideInitialReveal,
  estimateUnseenValue,
  findDenialTarget,
} from "../../src/ai/decide.js";
import { dealGrid } from "../../src/engine/grid.js";
import { createDeck } from "../../src/engine/deck.js";
import { grid, makeView } from "./helpers.js";

const zero = () => 0;
const half = () => 0.5;

describe("estimateUnseenValue", () => {
  it("senza conteggio (peso 0) restituisce sempre la media statica del mazzo", () => {
    const params = { ...getLevelParams(1), countingWeight: 0 };
    const view = makeView({ self: grid([[1]]), seenCounts: new Map([[12, 10]]) });
    const withSeen = estimateUnseenValue(view, params);
    const withoutSeen = estimateUnseenValue(makeView({ self: grid([[1]]) }), params);
    expect(withSeen).toBeCloseTo(withoutSeen, 6);
  });

  it("con conteggio pieno, escludere le carte più alte già viste abbassa la stima", () => {
    const params = { ...getLevelParams(10), countingWeight: 1 };
    const baseline = estimateUnseenValue(makeView({ self: grid([[1]]) }), params);
    const seenCounts = new Map([[12, 10]]) as ReadonlyMap<number, number>;
    const withHighSeen = estimateUnseenValue(
      makeView({ self: grid([[1]]), seenCounts: seenCounts as never }),
      params,
    );
    expect(withHighSeen).toBeLessThan(baseline);
  });
});

describe("decideInitialReveal", () => {
  it("sceglie sempre una posizione ancora coperta", () => {
    const { grid: playerGrid } = dealGrid(createDeck());
    const pos = decideInitialReveal(playerGrid, () => 0.999);
    expect(playerGrid[pos.column]![pos.row]!.faceUp).toBe(false);
  });

  it("lancia un errore se non ci sono più carte coperte", () => {
    expect(() => decideInitialReveal([], zero)).toThrow();
  });
});

describe("findDenialTarget", () => {
  it("individua una colonna avversaria con due carte scoperte uguali e una coperta", () => {
    const view = makeView({
      self: grid([[1]]),
      opponents: [grid([[7, 7, undefined]])],
    });
    expect(findDenialTarget(view, 7)).toEqual({ opponentIndex: 1, column: 0 });
  });

  it("restituisce null se non c'è nessuna colonna a rischio", () => {
    const view = makeView({ self: grid([[1]]), opponents: [grid([[7, 8, undefined]])] });
    expect(findDenialTarget(view, 7)).toBeNull();
  });
});

describe("decideDrawSource", () => {
  it("senza scarti pesca sempre dal mazzo", () => {
    const view = makeView({ self: grid([[1]]) });
    expect(decideDrawSource(view, getLevelParams(10), zero)).toBe("deck");
  });

  it("livello 10: prende uno scarto chiaramente favorevole", () => {
    const view = makeView({ self: grid([[5, 5, 5]]), discardTop: -2 });
    expect(decideDrawSource(view, getLevelParams(10), zero)).toBe("discard");
  });

  it("livello 10: rifiuta uno scarto chiaramente sfavorevole senza negazione possibile", () => {
    const view = makeView({ self: grid([[1, 1, 1]]), discardTop: 12 });
    expect(decideDrawSource(view, getLevelParams(10), zero)).toBe("deck");
  });

  it("livello 10: prende uno scarto sfavorevole per negarlo a un avversario", () => {
    const view = makeView({
      self: grid([[1, 1, 1]]),
      opponents: [grid([[12, 12, undefined]])],
      discardTop: 12,
    });
    expect(decideDrawSource(view, getLevelParams(10), zero)).toBe("discard");
  });
});

describe("choosePlacement", () => {
  it("forzato (dagli scarti) non rifiuta mai, anche senza guadagno", () => {
    const view = makeView({ self: grid([[1, 1, 1]]) });
    const result = choosePlacement(view, 12, getLevelParams(10), zero, { forced: true });
    expect(result.action).toBe("place");
  });

  it("non forzato (dal mazzo) rifiuta una carta che non migliora nulla", () => {
    const view = makeView({ self: grid([[1, 1, 1]]) });
    const result = choosePlacement(view, 12, getLevelParams(10), zero, { forced: false });
    expect(result.action).toBe("decline");
  });

  it("sceglie la posizione con il guadagno maggiore a livello 10", () => {
    const view = makeView({ self: grid([[9, 3, 1]]) });
    const result = choosePlacement(view, 0, getLevelParams(10), zero, { forced: true });
    expect(result).toEqual({ action: "place", column: 0, row: 0 });
  });

  it("evita di chiudere sull'ultima carta coperta se sfavorevole rispetto agli avversari", () => {
    const view = makeView({
      self: grid([[2, 2, undefined], [4]]),
      opponents: [grid([[3]])],
    });
    const result = choosePlacement(view, 1, getLevelParams(10), zero, { forced: true });
    expect(result).toEqual({ action: "place", column: 1, row: 0 });
  });

  it("chiude comunque sull'ultima carta coperta se è comunque favorevole", () => {
    const view = makeView({
      self: grid([[2, 2, undefined], [4]]),
      opponents: [grid([[50]])],
    });
    const result = choosePlacement(view, 1, getLevelParams(10), zero, { forced: true });
    expect(result).toEqual({ action: "place", column: 0, row: 2 });
  });

  it("livello 1 produce comunque solo posizioni legali, pur con scelte casuali", () => {
    const view = makeView({ self: grid([[9, 3, 1]]) });
    for (let seed = 0; seed < 20; seed += 1) {
      const rng = () => (seed * 0.137) % 1;
      const result = choosePlacement(view, 5, getLevelParams(1), rng, { forced: true });
      expect(result.action).toBe("place");
      if (result.action === "place") {
        expect(result.column).toBe(0);
        expect([0, 1, 2]).toContain(result.row);
      }
    }
  });
});

describe("decideDeckOutcome", () => {
  it("tiene una carta chiaramente migliorativa", () => {
    const view = makeView({ self: grid([[9, 3, 1]]) });
    const result = decideDeckOutcome(view, 0, getLevelParams(10), zero);
    expect(result).toEqual({ action: "keep", column: 0, row: 0 });
  });

  it("scarta una carta che non migliora nulla e scopre una carta coperta", () => {
    const view = makeView({ self: grid([[1, 1, undefined], [1, undefined]]) });
    const result = decideDeckOutcome(view, 12, getLevelParams(10), half);
    expect(result.action).toBe("discard");
    if (result.action === "discard") {
      const targetSlot = view.self.grid[result.column]![result.row]!;
      expect(targetSlot.faceUp).toBe(false);
    }
  });
});

describe("decideDiscardOutcome", () => {
  it("lancia un errore se non ci sono scarti", () => {
    const view = makeView({ self: grid([[1]]) });
    expect(() => decideDiscardOutcome(view, getLevelParams(10), zero)).toThrow();
  });

  it("restituisce sempre una posizione di sostituzione", () => {
    const view = makeView({ self: grid([[9, 3, 1]]), discardTop: 0 });
    const result = decideDiscardOutcome(view, getLevelParams(10), zero);
    expect(result).toEqual({ column: 0, row: 0 });
  });
});
