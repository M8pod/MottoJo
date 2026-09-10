import type { Card } from "../engine/types.js";
import {
  checkAndClearMatchingColumns,
  dealGrid,
  getSlot,
  isGridComplete,
  revealCoveredCard,
  sumFaceUpValues,
} from "../engine/grid.js";
import { drawAndDiscard as engineDrawAndDiscard, drawAndKeep as engineDrawAndKeep, takeDiscardAndReplace as engineTakeDiscardAndReplace } from "../engine/moves.js";
import { determineFirstRoundStarter } from "../engine/scoring.js";
import type { RoundAction, RoundEvent, RoundPlayer, RoundState } from "./types.js";

export interface NewPlayerSpec {
  readonly id: string;
  readonly name: string;
  readonly isHuman: boolean;
}

function countFaceUp(grid: RoundPlayer["grid"]): number {
  return grid.reduce((sum, col) => sum + col.filter((slot) => slot.faceUp).length, 0);
}

/**
 * Crea lo stato iniziale di una manche: distribuisce 12 carte coperte a
 * ciascun giocatore dallo stack già mescolato, poi scopre la prima carta
 * degli scarti. Per la prima manche della partita `previousCloserIndex` è
 * null; dalla seconda in poi va passato l'indice di chi ha chiuso la manche
 * precedente (determina chi comincia, una volta completata la scoperta
 * iniziale di tutti).
 */
export function createRoundState(params: {
  readonly roundNumber: number;
  readonly players: readonly NewPlayerSpec[];
  readonly shuffledStack: readonly Card[];
  readonly previousCloserIndex?: number | null;
}): RoundState {
  const { roundNumber, players, shuffledStack } = params;
  const previousCloserIndex = params.previousCloserIndex ?? null;

  if (players.length === 0) {
    throw new Error("Serve almeno un giocatore per iniziare una manche.");
  }
  if (roundNumber > 1 && previousCloserIndex === null) {
    throw new Error("Dalla seconda manche in poi serve l'indice di chi ha chiuso la precedente.");
  }

  let stack = shuffledStack;
  const roundPlayers: RoundPlayer[] = [];
  for (const spec of players) {
    const { grid, remaining } = dealGrid(stack);
    stack = remaining;
    roundPlayers.push({ id: spec.id, name: spec.name, isHuman: spec.isHuman, grid });
  }

  if (stack.length === 0) {
    throw new Error("Il mazzo non ha una carta in più per aprire gli scarti dopo la distribuzione.");
  }
  const [firstDiscard, ...restDeck] = stack;

  return {
    roundNumber,
    players: roundPlayers,
    previousCloserIndex,
    phase: "initial-reveal",
    deck: restDeck,
    discard: [firstDiscard!],
    turnOrder: null,
    currentTurnIndex: -1,
    closingPlayerIndex: null,
    finalTurnsRemaining: 0,
    history: [],
  };
}

export function getCurrentPlayerIndex(state: RoundState): number | null {
  if (state.turnOrder === null || state.phase === "round-over") {
    return null;
  }
  return state.turnOrder[state.currentTurnIndex]!;
}

function pushEvents(state: RoundState, events: readonly RoundEvent[]): RoundState {
  return { ...state, history: [...state.history, ...events] };
}

function withPlayerGrid(
  players: readonly RoundPlayer[],
  playerIndex: number,
  grid: RoundPlayer["grid"],
): RoundPlayer[] {
  return players.map((p, i) => (i === playerIndex ? { ...p, grid } : p));
}

/** Se il giocatore ora di turno è quello umano, aggiunge l'evento di passaggio di mano. */
function withHandoffIfHuman(state: RoundState): RoundState {
  const current = getCurrentPlayerIndex(state);
  if (current === null) {
    return state;
  }
  if (state.players[current]!.isHuman) {
    return pushEvents(state, [{ type: "handoff-to-human", playerIndex: current }]);
  }
  return state;
}

function tryStartPlayingPhase(state: RoundState): RoundState {
  const allRevealedTwo = state.players.every((p) => countFaceUp(p.grid) === 2);
  if (!allRevealedTwo) {
    return state;
  }

  const starter =
    state.roundNumber === 1
      ? determineFirstRoundStarter(state.players.map((p) => sumFaceUpValues(p.grid)))
      : state.previousCloserIndex!;

  const n = state.players.length;
  const turnOrder = Array.from({ length: n }, (_, i) => (starter + i) % n);

  const started = pushEvents(
    { ...state, phase: "playing", turnOrder, currentTurnIndex: 0 },
    [{ type: "playing-started", playerIndex: starter, points: sumFaceUpValues(state.players[starter]!.grid) }],
  );

  return withHandoffIfHuman(started);
}

function applyRevealInitialCard(
  state: RoundState,
  action: Extract<RoundAction, { type: "REVEAL_INITIAL_CARD" }>,
): RoundState {
  if (state.phase !== "initial-reveal") {
    throw new Error("La scoperta delle due carte iniziali è possibile solo a inizio manche.");
  }
  const { playerIndex, column, row } = action;
  const player = state.players[playerIndex];
  if (!player) {
    throw new Error(`Giocatore ${playerIndex} non valido.`);
  }
  if (countFaceUp(player.grid) >= 2) {
    throw new Error(`${player.name} ha già scoperto le sue due carte iniziali.`);
  }

  const newGrid = revealCoveredCard(player.grid, column, row);
  const value = getSlot(newGrid, column, row).card.value;

  const next = pushEvents(
    { ...state, players: withPlayerGrid(state.players, playerIndex, newGrid) },
    [{ type: "initial-reveal", playerIndex, column, row, value }],
  );

  return tryStartPlayingPhase(next);
}

function advanceAfterMove(state: RoundState, movingPlayerIndex: number): RoundState {
  const grid = state.players[movingPlayerIndex]!.grid;
  const { grid: clearedGrid, clearedColumns } = checkAndClearMatchingColumns(grid);

  const clearEvents: RoundEvent[] = clearedColumns.map((column) => ({
    type: "column-cleared",
    playerIndex: movingPlayerIndex,
    column,
    value: grid[column]![0]!.card.value,
  }));

  let next: RoundState = pushEvents(
    { ...state, players: withPlayerGrid(state.players, movingPlayerIndex, clearedGrid) },
    clearEvents,
  );

  if (next.phase === "playing" && isGridComplete(clearedGrid)) {
    next = pushEvents(
      {
        ...next,
        phase: "final-turn",
        closingPlayerIndex: movingPlayerIndex,
        finalTurnsRemaining: next.players.length - 1,
      },
      [{ type: "round-closed", playerIndex: movingPlayerIndex }],
    );
  } else if (next.phase === "final-turn") {
    const remaining = next.finalTurnsRemaining - 1;
    next = { ...next, finalTurnsRemaining: remaining, phase: remaining === 0 ? "round-over" : "final-turn" };
  }

  if (next.phase === "round-over") {
    return next;
  }

  const turnOrder = next.turnOrder!;
  const currentTurnIndex = (next.currentTurnIndex + 1) % turnOrder.length;
  return withHandoffIfHuman({ ...next, currentTurnIndex });
}

function currentPlayerOrThrow(state: RoundState): number {
  if (state.phase !== "playing" && state.phase !== "final-turn") {
    throw new Error("Nessuna mossa di gioco possibile nella fase corrente.");
  }
  return getCurrentPlayerIndex(state)!;
}

export function applyAction(
  state: RoundState,
  action: RoundAction,
  rng: () => number = Math.random,
): RoundState {
  switch (action.type) {
    case "REVEAL_INITIAL_CARD":
      return applyRevealInitialCard(state, action);

    case "DRAW_AND_KEEP": {
      const playerIndex = currentPlayerOrThrow(state);
      const player = state.players[playerIndex]!;
      const before = getSlot(player.grid, action.column, action.row);
      const result = engineDrawAndKeep(
        { deck: state.deck, discard: state.discard },
        player.grid,
        action.column,
        action.row,
        rng,
      );
      const placedValue = getSlot(result.grid, action.column, action.row).card.value;
      const withMove = pushEvents(
        {
          ...state,
          players: withPlayerGrid(state.players, playerIndex, result.grid),
          deck: result.deck,
          discard: result.discard,
        },
        [
          {
            type: "move",
            playerIndex,
            source: "deck",
            action: "replace",
            column: action.column,
            row: action.row,
            placedValue,
            previous: { faceUp: before.faceUp, value: before.card.value },
          },
        ],
      );
      return advanceAfterMove(withMove, playerIndex);
    }

    case "DRAW_AND_DISCARD": {
      const playerIndex = currentPlayerOrThrow(state);
      const player = state.players[playerIndex]!;
      const result = engineDrawAndDiscard(
        { deck: state.deck, discard: state.discard },
        player.grid,
        action.column,
        action.row,
        rng,
      );
      const discardedValue = result.discard[0]!.value;
      const revealedValue = getSlot(result.grid, action.column, action.row).card.value;
      const withMove = pushEvents(
        {
          ...state,
          players: withPlayerGrid(state.players, playerIndex, result.grid),
          deck: result.deck,
          discard: result.discard,
        },
        [
          {
            type: "move",
            playerIndex,
            source: "deck",
            action: "discard",
            discardedValue,
            column: action.column,
            row: action.row,
            revealedValue,
          },
        ],
      );
      return advanceAfterMove(withMove, playerIndex);
    }

    case "TAKE_DISCARD_AND_REPLACE": {
      const playerIndex = currentPlayerOrThrow(state);
      const player = state.players[playerIndex]!;
      const before = getSlot(player.grid, action.column, action.row);
      const result = engineTakeDiscardAndReplace(
        { deck: state.deck, discard: state.discard },
        player.grid,
        action.column,
        action.row,
      );
      const placedValue = getSlot(result.grid, action.column, action.row).card.value;
      const withMove = pushEvents(
        {
          ...state,
          players: withPlayerGrid(state.players, playerIndex, result.grid),
          discard: result.discard,
        },
        [
          {
            type: "move",
            playerIndex,
            source: "discard",
            action: "replace",
            column: action.column,
            row: action.row,
            placedValue,
            previous: { faceUp: before.faceUp, value: before.card.value },
          },
        ],
      );
      return advanceAfterMove(withMove, playerIndex);
    }

    default: {
      const exhaustive: never = action;
      throw new Error(`Azione non riconosciuta: ${JSON.stringify(exhaustive)}`);
    }
  }
}

export function isRoundOver(state: RoundState): boolean {
  return state.phase === "round-over";
}
