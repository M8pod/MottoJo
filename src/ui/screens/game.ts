import { toPublicGrid } from "../../ai/view.js";
import type { PublicGrid } from "../../ai/types.js";
import { getSlot, GRID_COLUMNS, GRID_ROWS } from "../../engine/grid.js";
import { getWinners } from "../../engine/scoring.js";
import {
  announceListenTarget,
  announceScore,
  readColumn,
  readPosition,
  readRow,
  readWholeDeck,
} from "../../exploration/read.js";
import type { DeckListener } from "../../exploration/types.js";
import { NUMBER_WORDS } from "../../narration/fragments.js";
import { narrateEvent, type NarrationContext, type Verbosity } from "../../narration/narrate.js";
import { number, pause, renderTokens, text, type NarrationToken } from "../../narration/tokens.js";
import { ICONS } from "../icons.js";
import { createLimbAnimator, type LimbMove } from "../limbAnimation.js";
import { limbImageForOpponent } from "../limbAssets.js";
import { createNarrationPlayer } from "../narrationPlayer.js";
import { createMusicPlayer } from "../musicPlayer.js";
import { createSfxPlayer } from "../sfxPlayer.js";
import { valueBand } from "../valueBand.js";
import {
  HUMAN_DISPLAY_NAME,
  applyHumanAction,
  finishRoundIfOver,
  peekTopOfDeck,
  startMatch,
  type DeckPeek,
  type MatchState,
  type RoundScoreSummary,
} from "../../play/match.js";
import { createSavedMatch, getMatch, upsertMatch, type SavedMatch } from "../../play/matchStorage.js";
import { createSeededRng } from "../../play/rng.js";
import { humanDisplayName, loadAppSettings } from "../../setup/appSettings.js";
import { loadLastMatchConfig } from "../../setup/matchConfig.js";
import { getCurrentPlayerIndex } from "../../state/round.js";
import type { RoundAction } from "../../state/types.js";
import type { RouteRenderer } from "../router.js";

type ListenTarget = { readonly kind: "self" } | { readonly kind: "opponent"; readonly playerIndex: number };

type TurnUiState =
  | { readonly kind: "none" }
  | { readonly kind: "decide-deck-card"; readonly peek: DeckPeek }
  | { readonly kind: "placing-keep"; readonly peek: DeckPeek }
  | { readonly kind: "placing-discard-reveal"; readonly peek: DeckPeek }
  | { readonly kind: "placing-forced" };

const VERBOSITY: Verbosity = "dettagliata";

function humanIndex(match: MatchState): number {
  const index = match.players.findIndex((p) => p.isHuman);
  if (index === -1) throw new Error("Nessun giocatore umano nella partita.");
  return index;
}

function describeWinners(match: MatchState): string {
  const winners = getWinners(match.totals as number[]);
  const names = winners.map((i) => match.players[i]!.name);
  return names.length === 1 ? `Vince ${names[0]}.` : `Pareggio tra ${names.join(", ")}.`;
}

function describeTotals(match: MatchState): string {
  return match.players.map((p, i) => `${p.name} ${match.totals[i]}`).join(", ");
}

function buildRoundSummaryText(summary: RoundScoreSummary, match: MatchState): string {
  const perPlayer = match.players
    .map((p, i) => {
      const doubled = summary.doubled[i] ? " (raddoppiato)" : "";
      return `${p.name}: ${summary.scores[i]} punti${doubled}`;
    })
    .join("; ");
  const closing = match.finished
    ? ` Partita finita! ${describeWinners(match)}`
    : ` Si comincia la manche ${match.roundNumber}.`;
  return `Manche finita. ${perPlayer}. Totali: ${describeTotals(match)}.${closing}`;
}

/**
 * Schermata di gioco (spec, sezione 7/punto 8): griglia propria reale,
 * mazzo/scarti, turni funzionanti tra umano e IA usando il motore vero
 * (src/state, src/ai, src/engine). Narrazione ed esplorazione recitate
 * davvero con i frammenti audio veri (`src/ui/narrationPlayer.ts`, in coda,
 * mai sovrapposte), oltre al testo mostrato nelle regioni aria-live per chi
 * legge lo schermo.
 */
export const renderGame: RouteRenderer = (container, params) => {
  const settings = loadAppSettings(window.localStorage);
  const humanName = humanDisplayName(settings, HUMAN_DISPLAY_NAME);

  let match: MatchState;
  let saved: SavedMatch;
  const resumeId = params["id"];
  const existing = resumeId ? getMatch(window.localStorage, resumeId) : undefined;
  if (existing) {
    saved = existing;
    match = existing.state;
  } else {
    const config = loadLastMatchConfig(window.localStorage);
    match = startMatch(config, Math.random, humanName);
    saved = upsertMatch(window.localStorage, createSavedMatch(config, match), match);
  }

  let turnUi: TurnUiState = { kind: "none" };
  let listening: ListenTarget = { kind: "self" };
  // Non si ri-narrano gli eventi già accaduti prima di questa apertura della schermata (partita ripresa): solo quelli nuovi da qui in poi.
  let narratedCount = match.round.history.length;
  let narratedRoundNumber = match.roundNumber;
  let cellButtons: HTMLButtonElement[][] = [];
  let focusedCell: { column: number; row: number } = { column: 0, row: 0 };
  let listenCellButtons: HTMLButtonElement[][] = [];
  let listenFocusedCell: { column: number; row: number } = { column: 0, row: 0 };
  let sfxPlayedForRound = existing ? match.roundNumber : -1;
  const narrationPlayer = createNarrationPlayer(() => loadAppSettings(window.localStorage).volumes.narration / 100);
  const sfxPlayer = createSfxPlayer(() => loadAppSettings(window.localStorage).volumes.sfx / 100);
  const musicPlayer = createMusicPlayer(
    "/assets/audio/musica/sottofondo.mp3",
    () => loadAppSettings(window.localStorage).volumes.music / 100,
  );
  musicPlayer.start();

  container.innerHTML = `
    <header class="app-header">
      <h1>Partita</h1>
    </header>
    <main>
      <section aria-labelledby="status-heading">
        <h2 id="status-heading" class="visually-hidden">Stato partita</h2>
        <p id="match-status" class="status-banner" aria-live="polite"></p>
      </section>

      <section aria-labelledby="table-heading">
        <h2 id="table-heading" class="visually-hidden">Mazzo e scarti</h2>
        <div id="table-area" class="pile-row"></div>
      </section>

      <section aria-labelledby="own-grid-heading">
        <h2 id="own-grid-heading">Il tuo Deck</h2>
        <p id="turn-prompt" tabindex="-1" aria-live="polite" class="turn-prompt"></p>
        <div id="own-grid" class="card-grid" role="grid" aria-label="Il tuo Deck, 3 righe per 4 colonne"></div>
        <div id="turn-actions" class="action-bar"></div>
      </section>

      <section id="listen-grid-section" aria-labelledby="listen-grid-heading" hidden>
        <h2 id="listen-grid-heading">Deck in ascolto</h2>
        <p id="listen-target" aria-live="polite"></p>
        <div id="listen-grid" class="card-grid" role="grid" aria-label="Deck in ascolto, 3 righe per 4 colonne"></div>
      </section>

      <section aria-labelledby="exploration-heading">
        <h2 id="exploration-heading">Esplora un Deck</h2>
        <div id="exploration-controls"></div>
        <p id="exploration-output" aria-live="polite"></p>
      </section>

      <section aria-labelledby="narration-heading">
        <h2 id="narration-heading">Narrazione</h2>
        <div id="narration-log" class="narration-log" aria-live="polite"></div>
      </section>

      <p><a href="#/" class="icon-link">${ICONS.home}<span>Torna alla schermata iniziale</span></a></p>
    </main>
  `;

  const $ = <T extends HTMLElement>(selector: string): T => {
    const el = container.querySelector<T>(selector);
    if (!el) throw new Error(`Elemento mancante nella schermata di gioco: ${selector}`);
    return el;
  };

  const limbAnimator = createLimbAnimator(() => cellButtons[0]?.[0] ?? null);

  function flashElement(el: Element | null): void {
    if (!el) return;
    el.classList.remove("pile-visual--flash");
    void (el as HTMLElement).offsetWidth;
    el.classList.add("pile-visual--flash");
  }

  function flashDiscardPile(): void {
    flashElement(container.querySelector("#btn-take-discard .pile-visual"));
  }

  /**
   * Un evento "move" di un avversario avviene sempre col suo Deck già
   * mostrato nella sezione "Deck in ascolto" (il cambio vista è sincrono,
   * fatto prima di arrivare qui — vedi `narrateNewEvents`): la destinazione
   * dell'arto è quindi sempre un elemento vero a schermo, mai un ritiro a
   * vuoto. Suoni sincronizzati con l'animazione, non sparati subito: "pesca
   * dal mazzo"/"presa dagli scarti" quando l'arto tocca la fonte,
   * "scarto" quando la carta arriva a destinazione (spec sezione 4,
   * "suono breve prima, poi la vocalizzazione" — qui vale anche per il
   * suono e il gesto visivo).
   */
  function enqueueLimbAnimationForEvent(event: (typeof match.round.history)[number]): boolean {
    if (event.type !== "move") return false;
    const player = match.players[event.playerIndex];
    if (!player || player.isHuman) return false;
    const imageSrc = limbImageForOpponent(player.id);
    if (!imageSrc) return false;

    const getSourceEl = () =>
      event.source === "deck"
        ? container.querySelector<HTMLElement>("#btn-draw-deck")
        : container.querySelector<HTMLElement>("#btn-take-discard");
    const onArrive = () => sfxPlayer.play(event.source === "deck" ? "pesca_mazzo" : "presa_scarti");

    const move: LimbMove =
      event.action === "discard"
        ? {
            imageSrc,
            getSourceEl,
            getDestinationEl: () => container.querySelector<HTMLElement>("#btn-take-discard"),
            peek: { kind: "covered" },
            onArrive,
            onSettle: () => {
              flashDiscardPile();
              sfxPlayer.play("scarto");
            },
          }
        : {
            imageSrc,
            getSourceEl,
            getDestinationEl: () => listenCellButtons[event.column]?.[event.row] ?? null,
            peek:
              event.source === "discard"
                ? { kind: "value", value: event.placedValue, band: valueBand(event.placedValue) }
                : { kind: "covered" },
            onArrive,
            onSettle: () => {
              flashElement(listenCellButtons[event.column]?.[event.row] ?? null);
              flashDiscardPile();
              sfxPlayer.play("scarto");
            },
          };
    limbAnimator.enqueue(move);
    return true;
  }

  function setTurnPrompt(text: string): void {
    $("#turn-prompt").textContent = text;
  }

  function announceExploration(tokens: readonly NarrationToken[]): void {
    $("#exploration-output").textContent = renderTokens(tokens);
    narrationPlayer.enqueue(tokens);
  }

  function appendLog(text: string): void {
    const p = document.createElement("p");
    p.textContent = text;
    $("#narration-log").appendChild(p);
  }

  function currentListenerIndex(): number {
    return listening.kind === "self" ? humanIndex(match) : listening.playerIndex;
  }

  function currentListenGrid(): PublicGrid {
    return toPublicGrid(match.round.players[currentListenerIndex()]!.grid);
  }

  function currentListener(): DeckListener {
    return listening.kind === "self"
      ? { kind: "self" }
      : { kind: "opponent", name: match.players[listening.playerIndex]!.name };
  }

  function renderListenTarget(): void {
    $("#listen-target").textContent = renderTokens(announceListenTarget(currentListener()));
  }

  function isSameListenTarget(a: ListenTarget, b: ListenTarget): boolean {
    return a.kind === "self" ? b.kind === "self" : b.kind === "opponent" && b.playerIndex === a.playerIndex;
  }

  /**
   * Unico punto che cambia `listening`: usato sia dal pulsante manuale "Cambia
   * Deck in ascolto" sia — spec, sezione 5 — dal cambio automatico di vista
   * quando tocca a un avversario virtuale. `playSound: false` solo per il
   * passaggio di mano all'umano, che ha un suono dedicato e ha la priorità
   * sul suono di cambio Deck (spec, sezione 4).
   */
  function switchListening(target: ListenTarget, playSound: boolean = true): void {
    if (isSameListenTarget(listening, target)) return;
    listening = target;
    if (playSound) sfxPlayer.play("cambio_deck");
    renderListenTarget();
    renderListenGridSection();
    narrationPlayer.enqueue(announceListenTarget(currentListener()));
  }

  function onCycleListen(): void {
    const opponentTargets: ListenTarget[] = match.players
      .map((p, i) => ({ player: p, index: i }))
      .filter(({ player }) => !player.isHuman)
      .map(({ index }) => ({ kind: "opponent" as const, playerIndex: index }));
    const order: ListenTarget[] = [{ kind: "self" }, ...opponentTargets];
    const currentPos = order.findIndex((t) => isSameListenTarget(t, listening));
    switchListening(order[(currentPos + 1) % order.length]!);
  }

  function buildExplorationControls(): void {
    const el = $("#exploration-controls");
    const rowButtons = [1, 2, 3]
      .map(
        (r) =>
          `<button type="button" data-row="${r}" class="icon-btn icon-btn--compact">${ICONS.riga}<span>Riga ${r}</span></button>`,
      )
      .join("");
    const columnButtons = [1, 2, 3, 4]
      .map(
        (c) =>
          `<button type="button" data-column="${c}" class="icon-btn icon-btn--compact">${ICONS.colonna}<span>Colonna ${c}</span></button>`,
      )
      .join("");
    el.innerHTML = `
      <div class="icon-button-row">
        <button type="button" id="btn-cycle-listen" class="icon-btn">${ICONS.cambiaAscolto}<span>Cambia Deck in ascolto</span><kbd class="shortcut-hint" aria-hidden="true">Alt+Maiusc+C</kbd></button>
        <button type="button" id="btn-read-whole" class="icon-btn">${ICONS.decoIntero}<span>Leggi tutto il Deck</span><kbd class="shortcut-hint" aria-hidden="true">Alt+Maiusc+L</kbd></button>
        <button type="button" id="btn-sum-score" class="icon-btn">${ICONS.sommaPunti}<span>Somma punti</span><kbd class="shortcut-hint" aria-hidden="true">Alt+Maiusc+P</kbd></button>
      </div>
      <div class="exploration-group">
        <span class="exploration-group-label">Leggi una riga</span>
        <div class="icon-button-row">${rowButtons}</div>
      </div>
      <div class="exploration-group">
        <span class="exploration-group-label">Leggi una colonna</span>
        <div class="icon-button-row">${columnButtons}</div>
      </div>
    `;
    el.querySelector<HTMLButtonElement>("#btn-cycle-listen")!.addEventListener("click", onCycleListen);
    el.querySelectorAll<HTMLButtonElement>("button[data-row]").forEach((btn) => {
      const row = Number(btn.dataset["row"]) - 1;
      btn.addEventListener("click", () => announceExploration(readRow(currentListenGrid(), row)));
    });
    el.querySelectorAll<HTMLButtonElement>("button[data-column]").forEach((btn) => {
      const column = Number(btn.dataset["column"]) - 1;
      btn.addEventListener("click", () => announceExploration(readColumn(currentListenGrid(), column)));
    });
    el.querySelector<HTMLButtonElement>("#btn-read-whole")!.addEventListener("click", () => {
      announceExploration(readWholeDeck(currentListenGrid(), currentListener()));
    });
    el.querySelector<HTMLButtonElement>("#btn-sum-score")!.addEventListener("click", () => {
      announceExploration(announceScore(currentListenGrid(), currentListener()));
    });
  }

  function renderOwnGridCell(column: number, row: number): void {
    const humanIdx = humanIndex(match);
    const grid = match.round.players[humanIdx]!.grid;
    const publicGrid = toPublicGrid(grid);
    const button = cellButtons[column]![row]!;
    button.setAttribute("aria-label", renderTokens(readPosition(publicGrid, column, row)));
    const slot = getSlot(grid, column, row);
    button.classList.remove(
      "card-cell--covered",
      "card-cell--face-up",
      "card-cell--band-slate",
      "card-cell--band-ivory",
      "card-cell--band-green",
      "card-cell--band-gold",
      "card-cell--band-maroon",
    );
    if (slot.faceUp) {
      button.textContent = String(slot.card.value);
      button.classList.add("card-cell--face-up", `card-cell--band-${valueBand(slot.card.value)}`);
    } else {
      button.textContent = "";
      button.classList.add("card-cell--covered");
    }
  }

  function renderOwnGrid(): void {
    for (let column = 0; column < GRID_COLUMNS; column += 1) {
      for (let row = 0; row < GRID_ROWS; row += 1) {
        renderOwnGridCell(column, row);
      }
    }
  }

  /** Roving tabindex (pattern ARIA grid): una sola cella raggiungibile con
   * Tab alla volta, le frecce spostano il focus dentro la griglia — utile
   * soprattutto con una tastiera Bluetooth esterna. */
  function setFocusedCell(column: number, row: number, moveFocus: boolean): void {
    const clampedColumn = Math.min(Math.max(column, 0), GRID_COLUMNS - 1);
    const clampedRow = Math.min(Math.max(row, 0), GRID_ROWS - 1);
    cellButtons[focusedCell.column]![focusedCell.row]!.tabIndex = -1;
    focusedCell = { column: clampedColumn, row: clampedRow };
    const button = cellButtons[clampedColumn]![clampedRow]!;
    button.tabIndex = 0;
    if (moveFocus) button.focus();
  }

  function onGridKeydown(event: KeyboardEvent): void {
    const { column, row } = focusedCell;
    switch (event.key) {
      case "ArrowRight":
        event.preventDefault();
        setFocusedCell(column + 1, row, true);
        return;
      case "ArrowLeft":
        event.preventDefault();
        setFocusedCell(column - 1, row, true);
        return;
      case "ArrowDown":
        event.preventDefault();
        setFocusedCell(column, row + 1, true);
        return;
      case "ArrowUp":
        event.preventDefault();
        setFocusedCell(column, row - 1, true);
        return;
      case "Home":
        event.preventDefault();
        setFocusedCell(0, row, true);
        return;
      case "End":
        event.preventDefault();
        setFocusedCell(GRID_COLUMNS - 1, row, true);
        return;
    }
  }

  function buildOwnGrid(): void {
    const gridEl = $("#own-grid");
    gridEl.innerHTML = "";
    cellButtons = Array.from({ length: GRID_COLUMNS }, () => new Array<HTMLButtonElement>(GRID_ROWS));
    for (let row = 0; row < GRID_ROWS; row += 1) {
      const rowEl = document.createElement("div");
      rowEl.className = "card-row";
      rowEl.setAttribute("role", "row");
      for (let column = 0; column < GRID_COLUMNS; column += 1) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "card-cell";
        button.setAttribute("role", "gridcell");
        button.tabIndex = column === 0 && row === 0 ? 0 : -1;
        button.addEventListener("click", () => {
          setFocusedCell(column, row, false);
          onCellClick(column, row);
        });
        rowEl.appendChild(button);
        cellButtons[column]![row] = button;
      }
      gridEl.appendChild(rowEl);
    }
    gridEl.addEventListener("keydown", onGridKeydown);
    renderOwnGrid();
  }

  /**
   * "Deck in ascolto" (spec, sezione 3): lo stesso Deck che i pulsanti di
   * esplorazione già leggono ad alta voce, ora mostrato anche a schermo e
   * navigabile — inclusivo per chi vede (guarda il Deck di un avversario)
   * e per chi usa VoiceOver (stessa griglia con `role="grid"`, roving
   * tabindex e frecce, stessa regola anti-imbroglio: una cella coperta non
   * porta con sé alcun valore, letta da `PublicGrid`). Sola lettura: non si
   * può agire sul Deck di qualcun altro, toccare una cella la legge ad alta
   * voce (esplorazione tattile, spec sezione 3) invece di fare nulla.
   * Nascosta quando si ascolta il proprio Deck: "Il tuo Deck" qui sopra è
   * già quella vista, niente da duplicare.
   */
  function setListenFocusedCell(column: number, row: number, moveFocus: boolean): void {
    const clampedColumn = Math.min(Math.max(column, 0), GRID_COLUMNS - 1);
    const clampedRow = Math.min(Math.max(row, 0), GRID_ROWS - 1);
    const previous = listenCellButtons[listenFocusedCell.column]?.[listenFocusedCell.row];
    if (previous) previous.tabIndex = -1;
    listenFocusedCell = { column: clampedColumn, row: clampedRow };
    const button = listenCellButtons[clampedColumn]![clampedRow]!;
    button.tabIndex = 0;
    if (moveFocus) button.focus();
  }

  function onListenGridKeydown(event: KeyboardEvent): void {
    const { column, row } = listenFocusedCell;
    switch (event.key) {
      case "ArrowRight":
        event.preventDefault();
        setListenFocusedCell(column + 1, row, true);
        return;
      case "ArrowLeft":
        event.preventDefault();
        setListenFocusedCell(column - 1, row, true);
        return;
      case "ArrowDown":
        event.preventDefault();
        setListenFocusedCell(column, row + 1, true);
        return;
      case "ArrowUp":
        event.preventDefault();
        setListenFocusedCell(column, row - 1, true);
        return;
      case "Home":
        event.preventDefault();
        setListenFocusedCell(0, row, true);
        return;
      case "End":
        event.preventDefault();
        setListenFocusedCell(GRID_COLUMNS - 1, row, true);
        return;
    }
  }

  function buildListenGrid(): void {
    const gridEl = $("#listen-grid");
    gridEl.innerHTML = "";
    listenCellButtons = Array.from({ length: GRID_COLUMNS }, () => new Array<HTMLButtonElement>(GRID_ROWS));
    for (let row = 0; row < GRID_ROWS; row += 1) {
      const rowEl = document.createElement("div");
      rowEl.className = "card-row";
      rowEl.setAttribute("role", "row");
      for (let column = 0; column < GRID_COLUMNS; column += 1) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "card-cell";
        button.setAttribute("role", "gridcell");
        button.tabIndex = column === 0 && row === 0 ? 0 : -1;
        button.addEventListener("click", () => {
          setListenFocusedCell(column, row, false);
          announceExploration(readPosition(currentListenGrid(), column, row));
        });
        rowEl.appendChild(button);
        listenCellButtons[column]![row] = button;
      }
      gridEl.appendChild(rowEl);
    }
    gridEl.addEventListener("keydown", onListenGridKeydown);
  }

  function renderListenGridCells(): void {
    const grid = currentListenGrid();
    for (let column = 0; column < GRID_COLUMNS; column += 1) {
      for (let row = 0; row < GRID_ROWS; row += 1) {
        const button = listenCellButtons[column]![row]!;
        const slot = grid[column]![row]!;
        button.setAttribute("aria-label", renderTokens(readPosition(grid, column, row)));
        button.classList.remove(
          "card-cell--covered",
          "card-cell--face-up",
          "card-cell--band-slate",
          "card-cell--band-ivory",
          "card-cell--band-green",
          "card-cell--band-gold",
          "card-cell--band-maroon",
        );
        if (slot.faceUp) {
          button.textContent = String(slot.value);
          button.classList.add("card-cell--face-up", `card-cell--band-${valueBand(slot.value)}`);
        } else {
          button.textContent = "";
          button.classList.add("card-cell--covered");
        }
      }
    }
  }

  /** Aggiorna intestazione, visibilità e contenuto della sezione "Deck in
   * ascolto" in base a `listening` — richiamata a ogni cambio, manuale o
   * automatico durante il turno di un avversario. */
  function renderListenGridSection(): void {
    const section = $("#listen-grid-section");
    if (listening.kind === "self") {
      section.hidden = true;
      return;
    }
    section.hidden = false;
    $("#listen-grid-heading").textContent = `Deck di ${match.players[listening.playerIndex]!.name}`;
    renderListenGridCells();
  }

  /** Mazzo e scarti sono insieme l'oggetto visivo E il pulsante azione
   * (pescare/prendere): chi vede tocca il mucchio di carte, chi ascolta
   * sente un'etichetta con la stessa azione — nessun testo separato da
   * cercare altrove. Disabilitati quando non è il momento di pescare. */
  function renderTableArea(): void {
    const el = $("#table-area");
    const topDiscard = match.round.discard[0];
    const canAct = !match.finished && match.round.phase !== "initial-reveal" && turnUi.kind === "none";
    const canTakeDiscard = canAct && Boolean(topDiscard);
    const deckCount = match.round.deck.length;

    el.innerHTML = `
      <button type="button" id="btn-draw-deck" class="pile-button">
        <span class="pile-visual pile-visual--back" aria-hidden="true"></span>
        <span class="pile-label">Mazzo<span class="pile-sub" id="deck-count-sub"></span></span>
      </button>
      <button type="button" id="btn-take-discard" class="pile-button">
        <span class="pile-visual${topDiscard ? ` card-cell--face-up card-cell--band-${valueBand(topDiscard.value)}` : " pile-visual--empty"}" aria-hidden="true">${topDiscard ? topDiscard.value : "—"}</span>
        <span class="pile-label">Scarti<span class="pile-sub" id="discard-top-sub"></span></span>
      </button>
    `;

    const drawBtn = el.querySelector<HTMLButtonElement>("#btn-draw-deck")!;
    drawBtn.disabled = !canAct;
    drawBtn.setAttribute(
      "aria-label",
      `Pesca dal mazzo coperto. ${deckCount} ${deckCount === 1 ? "carta rimasta" : "carte rimaste"}.`,
    );
    el.querySelector("#deck-count-sub")!.textContent = `${deckCount} ${deckCount === 1 ? "carta" : "carte"}`;
    drawBtn.addEventListener("click", onDrawDeck);

    const takeBtn = el.querySelector<HTMLButtonElement>("#btn-take-discard")!;
    takeBtn.disabled = !canTakeDiscard;
    takeBtn.setAttribute(
      "aria-label",
      topDiscard ? `Prendi dagli scarti. In cima: ${NUMBER_WORDS[topDiscard.value]}.` : "Scarti vuoti.",
    );
    el.querySelector("#discard-top-sub")!.textContent = topDiscard ? NUMBER_WORDS[topDiscard.value]! : "vuoti";
    takeBtn.addEventListener("click", onTakeDiscard);
  }

  function renderMatchStatus(): void {
    const totals = `Totali: ${describeTotals(match)}.`;
    if (match.finished) {
      $("#match-status").textContent = `Partita finita. ${describeWinners(match)} ${totals}`;
      return;
    }
    const current = getCurrentPlayerIndex(match.round);
    const turnText =
      match.round.phase === "initial-reveal"
        ? "Scoperta iniziale delle carte."
        : current !== null
          ? match.round.players[current]!.isHuman
            ? "Tocca a te."
            : `Turno di ${match.round.players[current]!.name}.`
          : "";
    $("#match-status").textContent = `Manche ${match.roundNumber}. ${turnText} ${totals}`;
  }

  function renderTurnActions(): void {
    const actions = $("#turn-actions");

    if (match.finished) {
      actions.innerHTML = "";
      setTurnPrompt("");
      return;
    }

    if (match.round.phase === "initial-reveal") {
      const humanIdx = humanIndex(match);
      const revealed = match.round.players[humanIdx]!.grid.flat().filter((s) => s.faceUp).length;
      setTurnPrompt(
        revealed === 0
          ? "Scopri due carte del tuo Deck: scegli una cella qualsiasi."
          : "Scopri un'altra carta del tuo Deck.",
      );
      actions.innerHTML = "";
      return;
    }

    if (turnUi.kind === "none") {
      setTurnPrompt("Tocca a te: pesca dal mazzo coperto o prendi dagli scarti qui sopra.");
      actions.innerHTML = "";
      return;
    }

    if (turnUi.kind === "decide-deck-card") {
      const { peek } = turnUi;
      setTurnPrompt(`Hai pescato: ${NUMBER_WORDS[peek.value]}.`);
      actions.innerHTML = `
        <div class="drawn-card-row">
          <div class="card-cell card-cell--face-up card-cell--band-${valueBand(peek.value)} drawn-card" aria-hidden="true">${peek.value}</div>
          <div class="action-bar">
            <button type="button" id="btn-keep" class="icon-btn icon-btn--primary">${ICONS.tieni}<span>Tieni questa carta</span><kbd class="shortcut-hint" aria-hidden="true">Alt+Maiusc+T</kbd></button>
            <button type="button" id="btn-discard-drawn" class="icon-btn">${ICONS.scarta}<span>Scarta questa carta</span><kbd class="shortcut-hint" aria-hidden="true">Alt+Maiusc+X</kbd></button>
          </div>
        </div>
      `;
      const keepBtn = actions.querySelector<HTMLButtonElement>("#btn-keep")!;
      keepBtn.addEventListener("click", () => onKeepDrawnCard(peek));
      actions.querySelector<HTMLButtonElement>("#btn-discard-drawn")!.addEventListener("click", () => onDiscardDrawnCard(peek));
      keepBtn.focus();
      return;
    }

    actions.innerHTML = "";
    if (turnUi.kind === "placing-keep") {
      setTurnPrompt("Scegli una cella del tuo Deck per piazzarla.");
    } else if (turnUi.kind === "placing-discard-reveal") {
      setTurnPrompt("Scegli una carta ancora coperta da scoprire al suo posto.");
    } else {
      setTurnPrompt("Scegli una cella del tuo Deck per sostituirla.");
    }
    $("#turn-prompt").focus();
  }

  /** "Mescolio" + "disposizione" (spec sezione 4) a ogni inizio manche —
   * mazzo nuovo mescolato e 12 carte distribuite a ciascuno — una volta sola
   * per manche, mai su una partita ripresa alla manche in cui era rimasta. */
  function maybePlayRoundStartSfx(): void {
    if (sfxPlayedForRound === match.roundNumber) return;
    sfxPlayedForRound = match.roundNumber;
    sfxPlayer.play("mescolio");
    window.setTimeout(() => sfxPlayer.play("disposizione"), 550);
  }

  function narrateNewEvents(): void {
    maybePlayRoundStartSfx();
    if (match.roundNumber !== narratedRoundNumber) {
      narratedCount = 0;
      narratedRoundNumber = match.roundNumber;
    }
    const ctx: NarrationContext = {
      verbosity: VERBOSITY,
      playerName: (i) => match.players[i]!.name,
      isHuman: (i) => match.players[i]!.isHuman,
    };
    let anyLimbMove = false;
    for (const event of match.round.history.slice(narratedCount)) {
      if (event.type === "move") {
        const player = match.players[event.playerIndex]!;
        if (player.isHuman) {
          sfxPlayer.play("scarto");
        } else {
          // Il Deck di chi gioca va mostrato PRIMA di narrare/animare la sua
          // mossa (spec, sezione 5): suono "Cambio Deck" + vista aggiornata,
          // così quando l'arto compare il suo Deck è già quello giusto a
          // schermo. In coda con l'animazione (non subito): con più
          // avversari di fila lo stato cambierebbe più volte nello stesso
          // istante sincrono, e si vedrebbe solo l'ultimo Deck, mai quelli
          // intermedi (stesso bug di "torna a sé troppo presto", qui per il
          // cambio nell'altro verso — trovato allo stesso modo).
          const playerIndex = event.playerIndex;
          limbAnimator.runAfterQueue(() => switchListening({ kind: "opponent", playerIndex }));
        }
      } else if (event.type === "column-cleared") {
        sfxPlayer.play("colonna_fanfara");
      } else if (event.type === "round-closed") {
        sfxPlayer.play("ultimo_turno");
      } else if (event.type === "handoff-to-human") {
        // Si torna alla propria vista solo a fine coda animazioni, non
        // subito: il cambio di stato è sincrono, ma se si tornasse alla
        // propria vista nello stesso istante in cui si passa a quella
        // dell'avversario il suo Deck non si vedrebbe mai davvero (bug
        // trovato controllando in un browser headless). Suono dedicato,
        // ha priorità sul "Cambio Deck" (spec sezione 4): si torna alla
        // propria vista in silenzio, poi suona solo questo.
        limbAnimator.runAfterQueue(() => {
          switchListening({ kind: "self" }, false);
          sfxPlayer.play("passaggio_mano");
        });
      }

      const tokens = narrateEvent(event, ctx);
      if (tokens) {
        appendLog(renderTokens(tokens));
        narrationPlayer.enqueue(tokens);
      }
      if (enqueueLimbAnimationForEvent(event)) anyLimbMove = true;
    }
    narratedCount = match.round.history.length;
    if (anyLimbMove) {
      // Chi ha appena giocato potrebbe aver spostato lo scroll (es. focus sul
      // messaggio di turno): riporta in vista mazzo/scarti perché
      // l'animazione dell'avversario si veda davvero. Non tocca il focus
      // reale, quindi non ha alcun effetto per chi usa VoiceOver.
      $("#table-area").scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  /** Vittoria/sconfitta (spec sezione 4) dal punto di vista del giocatore
   * umano: manche persa/vinta di per sé, ma se la partita finisce con
   * quella manche il suono di fine partita prende il posto di quello di
   * manche (è l'evento più importante dei due). */
  function playRoundOutcomeSfx(summary: RoundScoreSummary): void {
    const humanIdx = humanIndex(match);
    if (match.finished) {
      const winners = getWinners(match.totals as number[]);
      sfxPlayer.play(winners.includes(humanIdx) ? "vittoria_partita" : "sconfitta");
      return;
    }
    const roundMin = Math.min(...summary.scores);
    sfxPlayer.play(summary.scores[humanIdx] === roundMin ? "vittoria_manche" : "sconfitta");
  }

  function afterStateChange(): void {
    if (match.round.phase === "round-over" && !match.finished) {
      const { match: scored, summary } = finishRoundIfOver(match);
      match = scored;
      if (summary) {
        appendLog(buildRoundSummaryText(summary, match));
        playRoundOutcomeSfx(summary);
      }
    }
    narrateNewEvents();
    renderOwnGrid();
    renderListenGridSection();
    renderTurnActions();
    renderMatchStatus();
    renderTableArea();
    saved = upsertMatch(window.localStorage, saved, match);
  }

  function dispatch(action: RoundAction, rng: () => number = Math.random): void {
    match = applyHumanAction(match, action, rng);
    afterStateChange();
  }

  function onDrawDeck(): void {
    if (match.round.phase === "initial-reveal" || match.finished || turnUi.kind !== "none") return;
    const peek = peekTopOfDeck(match.round, Math.random);
    turnUi = { kind: "decide-deck-card", peek };
    sfxPlayer.play("pesca_mazzo");
    // Unica eccezione alla regola "il turno umano non si narra mai" (spec,
    // sezione 3): qui non si narra una decisione, solo il fatto — quale
    // carta è appena stata pescata — altrimenti visibile solo a schermo.
    narrationPlayer.enqueue([text("hai_pescato"), number(peek.value), pause(".")]);
    renderTurnActions();
    renderTableArea();
  }

  function onTakeDiscard(): void {
    if (match.round.phase === "initial-reveal" || match.finished || turnUi.kind !== "none" || !match.round.discard[0])
      return;
    turnUi = { kind: "placing-forced" };
    sfxPlayer.play("presa_scarti");
    renderTurnActions();
    renderTableArea();
  }

  function onKeepDrawnCard(peek: DeckPeek): void {
    if (turnUi.kind !== "decide-deck-card") return;
    turnUi = { kind: "placing-keep", peek };
    renderTurnActions();
  }

  function onDiscardDrawnCard(peek: DeckPeek): void {
    if (turnUi.kind !== "decide-deck-card") return;
    turnUi = { kind: "placing-discard-reveal", peek };
    renderTurnActions();
  }

  function onCellClick(column: number, row: number): void {
    const humanIdx = humanIndex(match);
    const humanGrid = match.round.players[humanIdx]!.grid;
    const slot = getSlot(humanGrid, column, row);

    if (match.round.phase === "initial-reveal") {
      const revealedCount = humanGrid.flat().filter((s) => s.faceUp).length;
      if (slot.faceUp || revealedCount >= 2) return;
      dispatch({ type: "REVEAL_INITIAL_CARD", playerIndex: humanIdx, column, row });
      return;
    }

    switch (turnUi.kind) {
      case "none":
        announceExploration(readPosition(toPublicGrid(humanGrid), column, row));
        return;
      case "decide-deck-card":
        return;
      case "placing-keep": {
        const { seed } = turnUi.peek;
        turnUi = { kind: "none" };
        dispatch({ type: "DRAW_AND_KEEP", column, row }, createSeededRng(seed));
        return;
      }
      case "placing-discard-reveal": {
        if (slot.faceUp) {
          setTurnPrompt("Questa carta è già scoperta: scegli una carta ancora coperta.");
          return;
        }
        const { seed } = turnUi.peek;
        turnUi = { kind: "none" };
        dispatch({ type: "DRAW_AND_DISCARD", column, row }, createSeededRng(seed));
        return;
      }
      case "placing-forced":
        turnUi = { kind: "none" };
        dispatch({ type: "TAKE_DISCARD_AND_REPLACE", column, row });
        return;
    }
  }

  /**
   * Scorciatoie da tastiera per chi gioca con una tastiera Bluetooth
   * esterna. Sempre `Alt+Maiusc+<lettera>` (mai lettere nude): sulle
   * tastiere fisiche la navigazione rapida a lettera nuda di VoiceOver
   * (Mac) userebbe le stesse lettere per saltare tra elementi della
   * pagina — con un modificatore in più il conflitto non si presenta,
   * secondo la convenzione consigliata dalle ARIA Authoring Practices per
   * le scorciatoie personalizzate.
   */
  function onGlobalKeydown(event: KeyboardEvent): void {
    if (!event.altKey || !event.shiftKey || event.ctrlKey || event.metaKey) return;
    switch (event.key.toLowerCase()) {
      case "m":
        event.preventDefault();
        onDrawDeck();
        return;
      case "s":
        event.preventDefault();
        onTakeDiscard();
        return;
      case "t":
        if (turnUi.kind === "decide-deck-card") {
          event.preventDefault();
          onKeepDrawnCard(turnUi.peek);
        }
        return;
      case "x":
        if (turnUi.kind === "decide-deck-card") {
          event.preventDefault();
          onDiscardDrawnCard(turnUi.peek);
        }
        return;
      case "c":
        event.preventDefault();
        onCycleListen();
        return;
      case "l":
        event.preventDefault();
        announceExploration(readWholeDeck(currentListenGrid(), currentListener()));
        return;
      case "p":
        event.preventDefault();
        announceExploration(announceScore(currentListenGrid(), currentListener()));
        return;
      case "h":
        event.preventDefault();
        window.location.hash = "#/";
        return;
    }
  }
  document.addEventListener("keydown", onGlobalKeydown);

  if (existing) appendLog("Partita ripresa.");
  buildOwnGrid();
  buildListenGrid();
  buildExplorationControls();
  renderListenTarget();
  renderListenGridSection();
  narrateNewEvents();
  renderTurnActions();
  renderMatchStatus();
  renderTableArea();

  return () => {
    document.removeEventListener("keydown", onGlobalKeydown);
    limbAnimator.destroy();
    musicPlayer.stop();
  };
};
