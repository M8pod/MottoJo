import {
  buildShareText,
  deleteMatch,
  loadAllMatches,
  type SavedMatch,
} from "../../play/matchStorage.js";
import type { RouteRenderer } from "../router.js";

interface RowUiState {
  confirmingDelete: boolean;
  showingDetails: boolean;
  showingShare: boolean;
}

function describeOpponents(saved: SavedMatch): string {
  return saved.state.players
    .filter((p) => !p.isHuman)
    .map((p) => p.name)
    .join(", ");
}

function describeProgress(saved: SavedMatch): string {
  const totals = saved.state.players.map((p, i) => `${p.name} ${saved.state.totals[i]}`).join(", ");
  return `Manche ${saved.state.roundNumber}. Totali finora: ${totals}.`;
}

function describeResult(saved: SavedMatch): string {
  const totals = saved.state.players.map((p, i) => `${p.name} ${saved.state.totals[i]}`).join(", ");
  const min = Math.min(...saved.state.totals);
  const winners = saved.state.players.filter((_, i) => saved.state.totals[i] === min).map((p) => p.name);
  const winnerText = winners.length === 1 ? `Vince ${winners[0]}.` : `Pareggio tra ${winners.join(", ")}.`;
  return `${winnerText} Totali: ${totals}.`;
}

/**
 * Schermata "Le tue partite" (spec, sezione 6 / punto 9): riprendi partite
 * non concluse, rivedi la classifica di quelle concluse, elimina o
 * condividi (riepilogo testuale semplice, non uno storico mosse).
 */
export const renderMatches: RouteRenderer = (container) => {
  const uiState = new Map<string, RowUiState>();

  function stateFor(id: string): RowUiState {
    let s = uiState.get(id);
    if (!s) {
      s = { confirmingDelete: false, showingDetails: false, showingShare: false };
      uiState.set(id, s);
    }
    return s;
  }

  function renderList(): void {
    const matches = loadAllMatches(window.localStorage);
    const inProgress = matches.filter((m) => !m.state.finished);
    const completed = matches.filter((m) => m.state.finished);

    container.innerHTML = `
      <header class="app-header">
        <h1>Le tue partite</h1>
      </header>
      <main>
        <section aria-labelledby="in-progress-heading">
          <h2 id="in-progress-heading">Partite in corso</h2>
          ${inProgress.length === 0 ? "<p>Nessuna partita in corso.</p>" : `<ul id="in-progress-list"></ul>`}
        </section>
        <section aria-labelledby="completed-heading">
          <h2 id="completed-heading">Partite concluse</h2>
          ${completed.length === 0 ? "<p>Nessuna partita conclusa.</p>" : `<ul id="completed-list"></ul>`}
        </section>
        <p><a href="#/">Torna alla schermata iniziale</a></p>
      </main>
    `;

    if (inProgress.length > 0) {
      const list = container.querySelector<HTMLUListElement>("#in-progress-list")!;
      inProgress.forEach((saved) => list.appendChild(buildRow(saved, false)));
    }
    if (completed.length > 0) {
      const list = container.querySelector<HTMLUListElement>("#completed-list")!;
      completed.forEach((saved) => list.appendChild(buildRow(saved, true)));
    }
  }

  function buildRow(saved: SavedMatch, isCompleted: boolean): HTMLLIElement {
    const row = document.createElement("li");
    const ui = stateFor(saved.id);

    const summary = document.createElement("p");
    summary.textContent = `Avversari: ${describeOpponents(saved)}. ${isCompleted ? describeResult(saved) : describeProgress(saved)}`;
    row.appendChild(summary);

    const actions = document.createElement("div");
    row.appendChild(actions);

    if (!isCompleted) {
      const resumeLink = document.createElement("a");
      resumeLink.href = `#/game/${encodeURIComponent(saved.id)}`;
      resumeLink.textContent = "Riprendi";
      actions.appendChild(resumeLink);
    } else {
      const detailsBtn = document.createElement("button");
      detailsBtn.type = "button";
      detailsBtn.textContent = ui.showingDetails ? "Nascondi classifica" : "Rivedi classifica";
      detailsBtn.addEventListener("click", () => {
        ui.showingDetails = !ui.showingDetails;
        renderList();
      });
      actions.appendChild(detailsBtn);
    }

    const shareBtn = document.createElement("button");
    shareBtn.type = "button";
    shareBtn.textContent = "Condividi";
    shareBtn.addEventListener("click", () => {
      void onShare(saved, ui);
    });
    actions.appendChild(shareBtn);

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    if (ui.confirmingDelete) {
      deleteBtn.textContent = "Elimina davvero";
      deleteBtn.addEventListener("click", () => {
        deleteMatch(window.localStorage, saved.id);
        uiState.delete(saved.id);
        renderList();
      });
      const cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.textContent = "Annulla";
      cancelBtn.addEventListener("click", () => {
        ui.confirmingDelete = false;
        renderList();
      });
      actions.appendChild(deleteBtn);
      actions.appendChild(cancelBtn);
    } else {
      deleteBtn.textContent = "Elimina";
      deleteBtn.addEventListener("click", () => {
        ui.confirmingDelete = true;
        renderList();
      });
      actions.appendChild(deleteBtn);
    }

    if (isCompleted && ui.showingDetails) {
      const details = document.createElement("div");
      details.setAttribute("aria-live", "polite");
      const list = document.createElement("ul");
      saved.state.roundScores.forEach((scores, i) => {
        const item = document.createElement("li");
        item.textContent = `Manche ${i + 1}: ${saved.state.players.map((p, pi) => `${p.name} ${scores[pi]}`).join(", ")}`;
        list.appendChild(item);
      });
      details.appendChild(list);
      row.appendChild(details);
    }

    if (ui.showingShare) {
      const shareBox = document.createElement("div");
      const textarea = document.createElement("textarea");
      textarea.readOnly = true;
      textarea.rows = 5;
      textarea.value = buildShareText(saved);
      textarea.setAttribute("aria-label", "Riepilogo da condividere, testo selezionabile");
      shareBox.appendChild(textarea);

      if (navigator.clipboard?.writeText) {
        const copyBtn = document.createElement("button");
        copyBtn.type = "button";
        copyBtn.textContent = "Copia";
        const status = document.createElement("span");
        status.setAttribute("aria-live", "polite");
        copyBtn.addEventListener("click", () => {
          navigator.clipboard
            .writeText(textarea.value)
            .then(() => {
              status.textContent = "Copiato.";
            })
            .catch(() => {
              status.textContent = "Copia non riuscita: seleziona e copia il testo a mano.";
            });
        });
        shareBox.appendChild(copyBtn);
        shareBox.appendChild(status);
      }
      row.appendChild(shareBox);
    }

    return row;
  }

  async function onShare(saved: SavedMatch, ui: RowUiState): Promise<void> {
    const text = buildShareText(saved);
    if (navigator.share) {
      try {
        await navigator.share({ title: "Motto Jo", text });
        return;
      } catch {
        // L'utente ha annullato la condivisione nativa, o non è disponibile: si passa al testo copiabile qui sotto.
      }
    }
    ui.showingShare = true;
    renderList();
  }

  renderList();
};
