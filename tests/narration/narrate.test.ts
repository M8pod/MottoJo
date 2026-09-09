import { describe, expect, it } from "vitest";
import { narrateEvent, narrateScoreQuery, type NarrationContext } from "../../src/narration/narrate.js";
import { renderTokens } from "../../src/narration/tokens.js";
import type {
  ColumnClearedEvent,
  DiscardMoveEvent,
  HandoffToHumanEvent,
  ReplaceMoveEvent,
  RoundClosedEvent,
} from "../../src/state/types.js";

const PLAYERS = ["Roberto", "Elena", "Tu (umano)"];
const HUMAN_INDEX = 2;

function makeCtx(verbosity: "essenziale" | "dettagliata"): NarrationContext {
  return {
    verbosity,
    playerName: (i) => PLAYERS[i]!,
    isHuman: (i) => i === HUMAN_INDEX,
  };
}

function render(event: Parameters<typeof narrateEvent>[0], verbosity: "essenziale" | "dettagliata") {
  const tokens = narrateEvent(event, makeCtx(verbosity));
  return tokens === null ? null : renderTokens(tokens);
}

describe("narrazione: scarta e scopre (dallo spec)", () => {
  const event: DiscardMoveEvent = {
    type: "move",
    action: "discard",
    source: "deck",
    playerIndex: 0,
    discardedValue: 7,
    column: 0,
    row: 1,
    revealedValue: 4,
  };

  it("dettagliata riproduce esattamente l'esempio dello spec", () => {
    expect(render(event, "dettagliata")).toBe(
      "Roberto pesca dal mazzo, scarta un sette. Scopre riga due colonna uno: era coperta, ora è un quattro.",
    );
  });

  it("essenziale segue lo stesso stile del caso di sostituzione", () => {
    expect(render(event, "essenziale")).toBe(
      "Roberto scarta un sette e scopre riga due colonna uno: un quattro.",
    );
  });

  it("non si narra mai il turno del giocatore umano", () => {
    const humanEvent = { ...event, playerIndex: HUMAN_INDEX };
    expect(render(humanEvent, "dettagliata")).toBeNull();
  });
});

describe("narrazione: sostituzione (dallo spec)", () => {
  const fromDiscard: ReplaceMoveEvent = {
    type: "move",
    action: "replace",
    source: "discard",
    playerIndex: 1,
    column: 0,
    row: 1,
    placedValue: 5,
    previous: { faceUp: true, value: 9 },
  };

  it("dettagliata riproduce esattamente l'esempio dello spec", () => {
    expect(render(fromDiscard, "dettagliata")).toBe(
      "Elena prende dagli scarti un cinque, sostituisce riga due colonna uno. Lì c'era un nove, ora scartato.",
    );
  });

  it("essenziale riproduce esattamente l'esempio dello spec", () => {
    const fromDeck: ReplaceMoveEvent = {
      type: "move",
      action: "replace",
      source: "deck",
      playerIndex: 0,
      column: 0,
      row: 1,
      placedValue: 3,
      previous: { faceUp: false, value: 8 },
    };
    expect(render(fromDeck, "essenziale")).toBe("Roberto scambia riga due colonna uno con un tre.");
  });

  it("dettagliata segnala una posizione precedentemente coperta", () => {
    const event: ReplaceMoveEvent = {
      type: "move",
      action: "replace",
      source: "deck",
      playerIndex: 0,
      column: 2,
      row: 0,
      placedValue: 1,
      previous: { faceUp: false, value: 6 },
    };
    expect(render(event, "dettagliata")).toBe(
      "Roberto pesca dal mazzo, tiene un uno, sostituisce riga uno colonna tre. Era coperta, ora scartata.",
    );
  });
});

describe("narrazione: colonna annullata", () => {
  it("include sempre 'Motto Gioooooo!' prima della frase informativa", () => {
    const event: ColumnClearedEvent = { type: "column-cleared", playerIndex: 0, column: 2, value: 5 };
    expect(render(event, "essenziale")).toBe(
      "Motto Gioooooo! Roberto completa la colonna tre, annullata.",
    );
  });

  it("giocatore umano: seconda persona, mai il nome libero", () => {
    const event: ColumnClearedEvent = {
      type: "column-cleared",
      playerIndex: HUMAN_INDEX,
      column: 2,
      value: 5,
    };
    expect(render(event, "essenziale")).toBe("Motto Gioooooo! Completi la colonna tre, annullata.");
  });
});

describe("narrazione: chiusura manche", () => {
  it("avversario", () => {
    const event: RoundClosedEvent = { type: "round-closed", playerIndex: 0 };
    expect(render(event, "essenziale")).toBe(
      "Roberto scopre l'ultima carta, ultimo turno per tutti gli altri.",
    );
  });

  it("giocatore umano", () => {
    const event: RoundClosedEvent = { type: "round-closed", playerIndex: HUMAN_INDEX };
    expect(render(event, "essenziale")).toBe("Scopri l'ultima carta, ultimo turno per tutti gli altri.");
  });
});

describe("narrazione: passaggio di mano e scoperta iniziale", () => {
  it("passaggio di mano è sempre 'Tocca a te.'", () => {
    const event: HandoffToHumanEvent = { type: "handoff-to-human", playerIndex: HUMAN_INDEX };
    expect(render(event, "essenziale")).toBe("Tocca a te.");
  });

  it("la scoperta iniziale non è mai narrata", () => {
    expect(
      render({ type: "initial-reveal", playerIndex: 0, column: 0, row: 0, value: 5 }, "dettagliata"),
    ).toBeNull();
  });
});

describe("narrateScoreQuery", () => {
  it("Deck di un avversario cita il nome fisso", () => {
    expect(renderTokens(narrateScoreQuery("Roberto", 12))).toBe(
      "Punti dalle carte scoperte, Roberto: totale dodici.",
    );
  });

  it("proprio Deck è self-referenziale, mai il nome libero", () => {
    expect(renderTokens(narrateScoreQuery(null, 9))).toBe("Punti dalle tue carte scoperte: totale nove.");
  });

  it("i punteggi possono superare il range delle carte", () => {
    expect(renderTokens(narrateScoreQuery("Elena", 23))).toBe(
      "Punti dalle carte scoperte, Elena: totale ventitré.",
    );
  });
});
