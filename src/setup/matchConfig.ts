import { DEFAULT_OPPONENT, OPPONENT_ROSTER, type OpponentProfile } from "../ai/index.js";

/** Limiti di selezione avversari (spec, sezione 6 — "Scegli gli avversari"). */
export const MIN_OPPONENTS = 1;
export const MAX_OPPONENTS = 7;

export interface MatchConfig {
  readonly opponentIds: readonly string[];
  /**
   * "Partita veloce" (richiesta dell'utente dopo una prova con chi vede): la
   * narrazione giocata-per-giocata degli avversari virtuali è quella che
   * allunga di più una manche, ed è superflua per chi vede l'animazione
   * dell'arto e il Deck aggiornarsi a schermo. Spuntata, il narratore dice
   * solo di chi è il turno ("Turno di {nome}.") e resta zitto sulla mossa in
   * sé; suoni, animazione degli arti, registro scritto e tutti gli annunci
   * importanti (Motto Jo, ultimo turno, "Tocca a te") restano invariati.
   * Non spuntata (default), tutto resta come sempre: è il modo in cui chi non
   * vede segue la partita, mai da penalizzare per far correre chi vede.
   */
  readonly fastMatch: boolean;
}

/** Configurazione di default al primissimo avvio in assoluto (spec, sezione 6). */
export function defaultMatchConfig(): MatchConfig {
  return { opponentIds: [DEFAULT_OPPONENT.id], fastMatch: false };
}

export function isValidMatchConfig(value: unknown): value is MatchConfig {
  if (typeof value !== "object" || value === null) return false;
  const { opponentIds } = value as { opponentIds?: unknown };
  if (!Array.isArray(opponentIds)) return false;
  if (opponentIds.length < MIN_OPPONENTS || opponentIds.length > MAX_OPPONENTS) return false;
  const knownIds = new Set(OPPONENT_ROSTER.map((o) => o.id));
  if (!opponentIds.every((id): id is string => typeof id === "string" && knownIds.has(id))) return false;
  return new Set(opponentIds).size === opponentIds.length;
}

export type ToggleOutcome =
  | { readonly ok: true; readonly config: MatchConfig }
  | { readonly ok: false; readonly reason: "min" | "max" };

/**
 * Spunta/deseleziona un avversario, rispettando i limiti (spec, sezione 6:
 * minimo un avversario obbligatorio, massimo sette selezionabili). Non
 * applica il cambiamento se sforerebbe il limite: la UI mostra un avviso
 * chiaro invece di lasciar succedere silenziosamente qualcosa di non
 * valido.
 */
export function toggleOpponent(config: MatchConfig, id: string): ToggleOutcome {
  const selected = config.opponentIds.includes(id);
  if (selected) {
    if (config.opponentIds.length <= MIN_OPPONENTS) {
      return { ok: false, reason: "min" };
    }
    return { ok: true, config: { ...config, opponentIds: config.opponentIds.filter((x) => x !== id) } };
  }
  if (config.opponentIds.length >= MAX_OPPONENTS) {
    return { ok: false, reason: "max" };
  }
  return { ok: true, config: { ...config, opponentIds: [...config.opponentIds, id] } };
}

/** Spunta/deseleziona "Partita veloce" (vedi `MatchConfig.fastMatch`). */
export function setFastMatch(config: MatchConfig, fastMatch: boolean): MatchConfig {
  return { ...config, fastMatch };
}

/** Da id a profili completi (nome, livello), nell'ordine della configurazione. */
export function resolveOpponents(config: MatchConfig): readonly OpponentProfile[] {
  const byId = new Map(OPPONENT_ROSTER.map((o) => [o.id, o] as const));
  return config.opponentIds.map((id) => {
    const opponent = byId.get(id);
    if (!opponent) throw new Error(`Avversario sconosciuto: ${id}`);
    return opponent;
  });
}

/** Sottoinsieme di localStorage/sessionStorage effettivamente usato qui, per poter testare senza un DOM. */
export interface ConfigStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const STORAGE_KEY = "motto-jo:last-match-config";

/** L'ultima configurazione salvata ("Gioca subito"), o il default se non ce n'è una valida. */
export function loadLastMatchConfig(storage: ConfigStorage): MatchConfig {
  const raw = storage.getItem(STORAGE_KEY);
  if (raw === null) return defaultMatchConfig();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return defaultMatchConfig();
  }
  if (!isValidMatchConfig(parsed)) return defaultMatchConfig();
  // `fastMatch` è un campo aggiunto dopo: non richiesto da
  // `isValidMatchConfig` apposta, così una configurazione salvata prima della
  // sua introduzione resta valida (gli avversari scelti non si perdono)
  // invece di essere scartata in blocco — qui si applica solo il default
  // mancante. Stessa convenzione di `limbAnimationSpeed` in
  // `src/setup/appSettings.ts`.
  return { ...parsed, fastMatch: parsed.fastMatch === true };
}

export function saveMatchConfig(storage: ConfigStorage, config: MatchConfig): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(config));
}
