import { describe, expect, it } from "vitest";
import { createDeck, DECK_SIZE, shuffle } from "../src/engine/deck.js";
import { seededRng } from "./helpers.js";

describe("createDeck", () => {
  it("crea esattamente 150 carte", () => {
    const deck = createDeck();
    expect(deck).toHaveLength(150);
    expect(DECK_SIZE).toBe(150);
  });

  it("rispetta la distribuzione ufficiale Skyjo per valore", () => {
    const deck = createDeck();
    const counts = new Map<number, number>();
    for (const card of deck) {
      counts.set(card.value, (counts.get(card.value) ?? 0) + 1);
    }

    expect(counts.get(-2)).toBe(5);
    expect(counts.get(-1)).toBe(10);
    expect(counts.get(0)).toBe(15);
    for (let v = 1; v <= 12; v += 1) {
      expect(counts.get(v)).toBe(10);
    }
  });

  it("assegna a ogni carta un id univoco", () => {
    const deck = createDeck();
    const ids = new Set(deck.map((c) => c.id));
    expect(ids.size).toBe(deck.length);
  });
});

describe("shuffle", () => {
  it("preserva il multiset di carte (stessa lunghezza e stessi valori)", () => {
    const deck = createDeck();
    const shuffled = shuffle(deck, seededRng(42));

    expect(shuffled).toHaveLength(deck.length);
    expect([...shuffled].sort((a, b) => a.id.localeCompare(b.id))).toEqual(
      [...deck].sort((a, b) => a.id.localeCompare(b.id)),
    );
  });

  it("non muta l'array originale", () => {
    const deck = createDeck();
    const before = deck.slice();
    shuffle(deck, seededRng(1));
    expect(deck).toEqual(before);
  });

  it("è deterministico con lo stesso seed", () => {
    const deck = createDeck();
    const a = shuffle(deck, seededRng(7)).map((c) => c.id);
    const b = shuffle(deck, seededRng(7)).map((c) => c.id);
    expect(a).toEqual(b);
  });

  it("produce un ordine diverso da quello originale (con alta probabilità)", () => {
    const deck = createDeck();
    const shuffled = shuffle(deck, seededRng(123));
    expect(shuffled.map((c) => c.id)).not.toEqual(deck.map((c) => c.id));
  });
});
