import type { RoundPlayer, RoundState } from "../../src/state/types.js";

export function makeRoundState(
  players: readonly RoundPlayer[],
  overrides: Partial<RoundState> = {},
): RoundState {
  return {
    roundNumber: 1,
    previousCloserIndex: null,
    phase: "playing",
    deck: [],
    discard: [],
    turnOrder: players.map((_, i) => i),
    currentTurnIndex: 0,
    closingPlayerIndex: null,
    finalTurnsRemaining: 0,
    history: [],
    ...overrides,
    players,
  };
}
