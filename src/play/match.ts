import { OPPONENT_ROSTER, getLevelParams, type LevelNumber } from "../ai/index.js";
import { decideDeckOutcome, decideDiscardOutcome, decideDrawSource, decideInitialReveal } from "../ai/decide.js";
import { toPublicView } from "../ai/view.js";
import { createDeck, shuffle } from "../engine/deck.js";
import { drawFromDeck } from "../engine/moves.js";
import { addRoundScores, computeRoundScores, isGameOver } from "../engine/scoring.js";
import type { Card, CardValue } from "../engine/types.js";
import type { MatchConfig } from "../setup/matchConfig.js";
import { applyAction, createRoundState, getCurrentPlayerIndex, type NewPlayerSpec } from "../state/round.js";
import type { RoundAction, RoundState } from "../state/types.js";
import { createSeededRng } from "./rng.js";

export const HUMAN_ID = "human";
/** Mai pronunciato dalla voce narrante (regola trasversale, motto-jo-frasi-narrazione.md): solo per uso interno/di visualizzazione. */
export const HUMAN_DISPLAY_NAME = "Tu";

/**
 * `humanName` è solo per la visualizzazione a schermo e nei riepiloghi delle
 * partite salvate (spec, sezione "Extra"): sicuro da mettere qui perché la
 * voce narrante non pronuncia mai il nome del giocatore umano a prescindere
 * da questo valore — vedi `narrateMove`/`narrateColumnCleared` in
 * `src/narration/narrate.ts`, che per l'umano non leggono mai `playerName`.
 */
export function buildMatchPlayers(config: MatchConfig, humanName: string = HUMAN_DISPLAY_NAME): NewPlayerSpec[] {
  const opponents = config.opponentIds.map((id) => {
    const profile = OPPONENT_ROSTER.find((o) => o.id === id);
    if (!profile) throw new Error(`Avversario sconosciuto: ${id}`);
    return profile;
  });
  return [
    { id: HUMAN_ID, name: humanName, isHuman: true },
    ...opponents.map((o) => ({ id: o.id, name: o.name, isHuman: false })),
  ];
}

function levelForOpponent(id: string): LevelNumber {
  const profile = OPPONENT_ROSTER.find((o) => o.id === id);
  if (!profile) throw new Error(`Livello sconosciuto per l'id ${id}`);
  return profile.level;
}

/** All'inizio di ogni manche, ogni avversario virtuale sceglie da sé le sue due carte iniziali (spec, sezione 1). */
function autoRevealAiInitialCards(round: RoundState, rng: () => number): RoundState {
  let state = round;
  for (let i = 0; i < state.players.length; i += 1) {
    if (state.players[i]!.isHuman) continue;
    for (let k = 0; k < 2; k += 1) {
      const { column, row } = decideInitialReveal(state.players[i]!.grid, rng);
      state = applyAction(state, { type: "REVEAL_INITIAL_CARD", playerIndex: i, column, row });
    }
  }
  return state;
}

function runAiTurn(round: RoundState, playerIndex: number, rng: () => number): RoundState {
  const level = levelForOpponent(round.players[playerIndex]!.id);
  const params = getLevelParams(level);
  const view = toPublicView(round, playerIndex);
  const source = decideDrawSource(view, params, rng);

  if (source === "discard") {
    const { column, row } = decideDiscardOutcome(view, params, rng);
    return applyAction(round, { type: "TAKE_DISCARD_AND_REPLACE", column, row }, rng);
  }

  const seed = Math.floor(rng() * 2 ** 31);
  const peeked = drawFromDeck({ deck: round.deck, discard: round.discard }, createSeededRng(seed));
  const decision = decideDeckOutcome(view, peeked.card.value, params, rng);
  const type = decision.action === "keep" ? "DRAW_AND_KEEP" : "DRAW_AND_DISCARD";
  return applyAction(round, { type, column: decision.column, row: decision.row }, createSeededRng(seed));
}

/** Avanza automaticamente ogni turno di un avversario virtuale finché non tocca all'umano o la manche finisce. */
export function advanceUntilHumanOrRoundOver(round: RoundState, rng: () => number = Math.random): RoundState {
  let state = round;
  let guard = 0;
  while (state.phase !== "round-over") {
    const current = getCurrentPlayerIndex(state);
    if (current === null || state.players[current]!.isHuman) break;
    state = runAiTurn(state, current, rng);
    guard += 1;
    if (guard > 2000) {
      throw new Error("Troppi turni IA consecutivi: possibile ciclo infinito.");
    }
  }
  return state;
}

export function createNewRound(
  params: {
    readonly roundNumber: number;
    readonly players: readonly NewPlayerSpec[];
    readonly shuffledStack: readonly Card[];
    readonly previousCloserIndex?: number | null;
  },
  rng: () => number = Math.random,
): RoundState {
  const round = createRoundState(params);
  return autoRevealAiInitialCards(round, rng);
}

export interface MatchState {
  readonly players: readonly NewPlayerSpec[];
  readonly round: RoundState;
  readonly roundNumber: number;
  readonly totals: readonly number[];
  /** Punteggio di ogni manche già conclusa (raddoppio incluso), un elemento per manche: serve alla classifica in "Le tue partite". */
  readonly roundScores: readonly (readonly number[])[];
  readonly finished: boolean;
}

export function startMatch(
  config: MatchConfig,
  rng: () => number = Math.random,
  humanName: string = HUMAN_DISPLAY_NAME,
): MatchState {
  const players = buildMatchPlayers(config, humanName);
  const stack = shuffle(createDeck(), rng);
  const round = createNewRound({ roundNumber: 1, players, shuffledStack: stack }, rng);
  return { players, round, roundNumber: 1, totals: players.map(() => 0), roundScores: [], finished: false };
}

/** Applica un'azione decisa dal giocatore umano, poi lascia correre da sé gli eventuali turni IA successivi. */
export function applyHumanAction(
  match: MatchState,
  action: RoundAction,
  rng: () => number = Math.random,
): MatchState {
  const round = applyAction(match.round, action, rng);
  return { ...match, round: advanceUntilHumanOrRoundOver(round, rng) };
}

export interface DeckPeek {
  readonly value: CardValue;
  readonly seed: number;
}

/**
 * "Sbircia" la prossima carta del mazzo coperto senza cambiare stato. Il
 * `seed` restituito va poi passato a `createSeededRng` e usato come rng
 * dell'azione vera (`applyHumanAction`) sulla stessa `round`, invariata nel
 * frattempo: garantisce che la carta davvero pescata sia quella mostrata.
 */
export function peekTopOfDeck(round: RoundState, rng: () => number = Math.random): DeckPeek {
  const seed = Math.floor(rng() * 2 ** 31);
  const peeked = drawFromDeck({ deck: round.deck, discard: round.discard }, createSeededRng(seed));
  return { value: peeked.card.value, seed };
}

export interface RoundScoreSummary {
  readonly scores: readonly number[];
  readonly doubled: readonly boolean[];
  readonly totals: readonly number[];
}

/** Se la manche è finita, calcola punteggi/totali e prepara la manche successiva (o segna la partita finita). */
export function finishRoundIfOver(
  match: MatchState,
  rng: () => number = Math.random,
): { readonly match: MatchState; readonly summary: RoundScoreSummary | null } {
  if (match.round.phase !== "round-over" || match.finished) {
    return { match, summary: null };
  }
  const grids = match.round.players.map((p) => p.grid);
  const { scores, doubled } = computeRoundScores(grids, match.round.closingPlayerIndex!);
  const totals = addRoundScores(match.totals, scores);
  const roundScores = [...match.roundScores, scores];
  const summary: RoundScoreSummary = { scores, doubled, totals };

  if (isGameOver(totals)) {
    return { match: { ...match, totals, roundScores, finished: true }, summary };
  }

  const roundNumber = match.roundNumber + 1;
  const stack = shuffle(createDeck(), rng);
  const round = createNewRound(
    {
      roundNumber,
      players: match.players,
      shuffledStack: stack,
      previousCloserIndex: match.round.closingPlayerIndex,
    },
    rng,
  );
  return { match: { ...match, round, roundNumber, totals, roundScores }, summary };
}
