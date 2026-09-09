import type { CardValue } from "../../src/engine/types.js";
import type { PublicGrid, PublicPlayer, PublicSlot, PublicView } from "../../src/ai/types.js";

export function slot(value?: number): PublicSlot {
  return value === undefined ? { faceUp: false } : { faceUp: true, value: value as CardValue };
}

/** Colonne date come array di valori (undefined = coperta). */
export function grid(columns: readonly (number | undefined)[][]): PublicGrid {
  return columns.map((column) => column.map(slot));
}

export function makeView(params: {
  self: PublicGrid;
  opponents?: readonly PublicGrid[];
  discardTop?: number;
  deckSize?: number;
  seenCounts?: ReadonlyMap<CardValue, number>;
}): PublicView {
  const opponents: PublicPlayer[] = (params.opponents ?? []).map((g, i) => ({ index: i + 1, grid: g }));
  return {
    self: { index: 0, grid: params.self },
    opponents,
    discardTop: (params.discardTop as CardValue | undefined) ?? null,
    deckSize: params.deckSize ?? 100,
    seenCounts: params.seenCounts ?? new Map(),
  };
}
