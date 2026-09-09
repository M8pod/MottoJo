import type { MatchConfig } from "../setup/matchConfig.js";
import type { MatchState } from "./match.js";

/** Sottoinsieme di localStorage effettivamente usato qui, per poter testare senza un DOM (stessa convenzione di setup/matchConfig.ts). */
export interface ConfigStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface SavedMatch {
  readonly id: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly config: MatchConfig;
  readonly state: MatchState;
}

const STORAGE_KEY = "motto-jo:saved-matches";

function isRecordOfSavedMatch(value: unknown): value is Record<string, SavedMatch> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readAll(storage: ConfigStorage): Record<string, SavedMatch> {
  const raw = storage.getItem(STORAGE_KEY);
  if (raw === null) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return isRecordOfSavedMatch(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(storage: ConfigStorage, all: Record<string, SavedMatch>): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(all));
}

/** Tutte le partite salvate, più recenti prima. */
export function loadAllMatches(storage: ConfigStorage): SavedMatch[] {
  return Object.values(readAll(storage)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getMatch(storage: ConfigStorage, id: string): SavedMatch | undefined {
  return readAll(storage)[id];
}

/** Crea una nuova partita salvata (id nuovo) pronta per essere inserita con `upsertMatch`. */
export function createSavedMatch(config: MatchConfig, state: MatchState): SavedMatch {
  const now = new Date().toISOString();
  return { id: crypto.randomUUID(), createdAt: now, updatedAt: now, config, state };
}

/** Inserisce o aggiorna (per id) lo stato di una partita salvata, aggiornando `updatedAt`. */
export function upsertMatch(storage: ConfigStorage, saved: SavedMatch, state: MatchState): SavedMatch {
  const all = readAll(storage);
  const updated: SavedMatch = { ...saved, state, updatedAt: new Date().toISOString() };
  all[updated.id] = updated;
  writeAll(storage, all);
  return updated;
}

export function deleteMatch(storage: ConfigStorage, id: string): void {
  const all = readAll(storage);
  delete all[id];
  writeAll(storage, all);
}

/**
 * Riepilogo testuale semplice per la condivisione (spec, "Le tue partite"):
 * punteggi per manche e totale, non uno storico mosse. `player.name` è già
 * il nome giusto da mostrare (il proprio nome personalizzato dell'Extra, o
 * il default "Tu") — mai il caso di sostituirlo qui.
 */
export function buildShareText(saved: SavedMatch): string {
  const { state } = saved;
  const lines: string[] = [`Motto Jo — partita del ${new Date(saved.createdAt).toLocaleDateString("it-IT")}`];

  state.roundScores.forEach((scores, roundIndex) => {
    const parts = scores.map((score, i) => `${state.players[i]!.name}: ${score}`);
    lines.push(`Manche ${roundIndex + 1} — ${parts.join(", ")}`);
  });

  const totalsParts = state.totals.map((total, i) => `${state.players[i]!.name}: ${total}`);
  lines.push(state.finished ? `Totale finale — ${totalsParts.join(", ")}` : `Totale finora — ${totalsParts.join(", ")}`);

  if (state.finished) {
    const min = Math.min(...state.totals);
    const winners = state.players.filter((_, i) => state.totals[i] === min);
    const winnerNames = winners.map((p) => p.name).join(", ");
    lines.push(winners.length === 1 ? `Vince ${winnerNames}.` : `Pareggio tra ${winnerNames}.`);
  } else {
    lines.push(`Manche ${state.roundNumber} in corso.`);
  }

  return lines.join("\n");
}
