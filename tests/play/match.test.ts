import { describe, expect, it } from "vitest";
import { applyAction, getCurrentPlayerIndex } from "../../src/state/round.js";
import type { RoundState } from "../../src/state/types.js";
import { getSlot } from "../../src/engine/grid.js";
import { createSeededRng } from "../../src/play/rng.js";
import {
  HUMAN_ID,
  advanceUntilHumanOrRoundOver,
  applyHumanAction,
  buildMatchPlayers,
  finishRoundIfOver,
  peekTopOfDeck,
  startMatch,
  type MatchState,
} from "../../src/play/match.js";
import { seededRng, makeCard, makeGrid } from "../helpers.js";

describe("buildMatchPlayers", () => {
  it("mette sempre l'umano per primo, poi gli avversari scelti nell'ordine dato", () => {
    const players = buildMatchPlayers({ opponentIds: ["roger", "roberto"], fastMatch: false });
    expect(players.map((p) => p.id)).toEqual([HUMAN_ID, "roger", "roberto"]);
    expect(players[0]!.isHuman).toBe(true);
    expect(players[1]!.isHuman).toBe(false);
    expect(players[2]!.isHuman).toBe(false);
  });

  it("usa il nome personalizzato dell'umano quando fornito, altrimenti il default", () => {
    const custom = buildMatchPlayers({ opponentIds: ["roger"], fastMatch: false }, "Marta");
    expect(custom[0]!.name).toBe("Marta");
    const fallback = buildMatchPlayers({ opponentIds: ["roger"], fastMatch: false });
    expect(fallback[0]!.name).toBe("Tu");
  });
});

describe("startMatch", () => {
  it("scopre già le due carte iniziali di ogni IA ma lascia l'umano tutto coperto", () => {
    const match = startMatch({ opponentIds: ["roberto", "elena"], fastMatch: false }, seededRng(1));
    expect(match.round.phase).toBe("initial-reveal");

    const human = match.round.players[0]!;
    expect(human.grid.flat().every((slot) => !slot.faceUp)).toBe(true);

    for (const player of match.round.players.slice(1)) {
      const faceUp = player.grid.flat().filter((slot) => slot.faceUp);
      expect(faceUp).toHaveLength(2);
    }
    expect(match.totals).toEqual([0, 0, 0]);
    expect(match.roundScores).toEqual([]);
    expect(match.finished).toBe(false);
  });
});

describe("peekTopOfDeck + applyAction (coerenza pesca)", () => {
  it("nel caso comune (mazzo non vuoto) la carta piazzata è sempre quella sbirciata", () => {
    const match = startMatch({ opponentIds: ["roberto"], fastMatch: false }, seededRng(2));
    // Serve la fase "playing": l'umano scopre le sue due carte iniziali (l'IA le ha già scoperte in startMatch).
    const playing = applyAction(
      applyAction(match.round, { type: "REVEAL_INITIAL_CARD", playerIndex: 0, column: 0, row: 0 }),
      { type: "REVEAL_INITIAL_CARD", playerIndex: 0, column: 1, row: 0 },
    );
    const currentPlayer = getCurrentPlayerIndex(playing)!;
    const peek = peekTopOfDeck(playing, seededRng(3));
    const applied = applyAction(playing, { type: "DRAW_AND_KEEP", column: 2, row: 0 }, createSeededRng(peek.seed));
    expect(getSlot(applied.players[currentPlayer]!.grid, 2, 0).card.value).toBe(peek.value);
  });

  it("resta coerente anche quando il mazzo coperto è vuoto e serve rimescolare gli scarti", () => {
    const grid = makeGrid([[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]]);
    const round: RoundState = {
      roundNumber: 1,
      players: [{ id: "p", name: "P", isHuman: false, grid }],
      previousCloserIndex: null,
      phase: "playing",
      deck: [],
      discard: [makeCard(5), makeCard(7), makeCard(9)],
      turnOrder: [0],
      currentTurnIndex: 0,
      closingPlayerIndex: null,
      finalTurnsRemaining: 0,
      history: [],
    };

    const peek = peekTopOfDeck(round, seededRng(11));
    const applied = applyAction(round, { type: "DRAW_AND_KEEP", column: 0, row: 0 }, createSeededRng(peek.seed));
    expect(getSlot(applied.players[0]!.grid, 0, 0).card.value).toBe(peek.value);
  });
});

describe("simulazione di una manche completa", () => {
  it("arriva a round-over e produce un riepilogo punteggi coerente", () => {
    let match: MatchState = startMatch({ opponentIds: ["roger"], fastMatch: false }, seededRng(5));

    // L'umano scopre le sue due carte iniziali: questo fa scattare da solo
    // (tramite tryStartPlayingPhase dentro applyAction) l'inizio della fase di gioco.
    // Da qui in poi ogni cambio di stato passa da applyHumanAction, che dopo
    // ogni mossa umana lascia correre da sé gli eventuali turni IA successivi.
    match = {
      ...match,
      round: advanceUntilHumanOrRoundOver(
        applyAction(
          applyAction(match.round, { type: "REVEAL_INITIAL_CARD", playerIndex: 0, column: 0, row: 0 }),
          { type: "REVEAL_INITIAL_CARD", playerIndex: 0, column: 1, row: 0 },
        ),
        seededRng(50),
      ),
    };

    let guard = 0;
    while (match.round.phase !== "round-over") {
      // A questo punto del ciclo tocca sempre all'umano: applyHumanAction fa
      // già avanzare da sé ogni turno IA fino al prossimo turno umano (o
      // fine manche), quindi non serve gestire il caso "tocca a un'IA" qui.
      const cell = guard % 12;
      const column = Math.floor(cell / 3);
      const row = cell % 3;
      // Mossa sempre legale per l'umano, per portare la manche a termine in
      // modo deterministico: prende dagli scarti (nessun vincolo sulla
      // posizione) e sostituisce una cella a rotazione.
      match = applyHumanAction(match, { type: "TAKE_DISCARD_AND_REPLACE", column, row }, seededRng(100 + guard));
      guard += 1;
      if (guard > 300) throw new Error("La manche di test non converge: possibile bug nella simulazione.");
    }

    expect(match.round.phase).toBe("round-over");
    const { match: afterScoring, summary } = finishRoundIfOver(match, seededRng(999));
    expect(summary).not.toBeNull();
    expect(summary!.totals).toHaveLength(2);
    expect(summary!.scores).toHaveLength(2);
    expect(afterScoring.roundScores).toHaveLength(1);
    expect(afterScoring.roundScores[0]).toEqual(summary!.scores);
    if (!afterScoring.finished) {
      expect(afterScoring.roundNumber).toBe(2);
      expect(afterScoring.round.phase).toBe("initial-reveal");
    }
  });
});
