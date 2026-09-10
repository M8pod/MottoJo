import { OPPONENT_ROSTER } from "../../ai/index.js";
import { difficultyBand } from "../../setup/difficulty.js";
import { loadLastMatchConfig, saveMatchConfig, toggleOpponent } from "../../setup/matchConfig.js";
import type { RouteRenderer } from "../router.js";

const BLOCK_MESSAGES = {
  min: "Serve almeno un avversario selezionato.",
  max: "Puoi selezionare al massimo sette avversari.",
} as const;

/**
 * Schermata "Scegli gli avversari" (spec, sezione 6). Musica di sottofondo:
 * ancora nessun file audio pronto, per ora solo segnaposto non funzionante
 * (stesso trattamento della copertina nella schermata iniziale).
 */
export const renderOpponents: RouteRenderer = (container) => {
  let config = loadLastMatchConfig(window.localStorage);

  const rows = OPPONENT_ROSTER.map((opponent) => {
    const checked = config.opponentIds.includes(opponent.id) ? "checked" : "";
    return `
      <li>
        <label>
          <input type="checkbox" data-opponent-id="${opponent.id}" ${checked} />
          ${opponent.name}, livello ${opponent.level} (${difficultyBand(opponent.level)})
        </label>
      </li>
    `;
  }).join("");

  container.innerHTML = `
    <header class="app-header">
      <h1>Scegli gli avversari</h1>
    </header>
    <main>
      <p id="selection-status" role="alert"></p>
      <fieldset>
        <legend>Avversari (da uno a sette)</legend>
        <ul class="opponent-list">${rows}</ul>
      </fieldset>
      <fieldset>
        <legend>Musica di sottofondo</legend>
        <p>Non ancora disponibile.</p>
        <ul class="music-track-list">
          <li>
            <label><input type="radio" name="music-track" disabled /> Traccia 1</label>
            <button type="button" disabled>Anteprima</button>
          </li>
          <li>
            <label><input type="radio" name="music-track" disabled /> Traccia 2</label>
            <button type="button" disabled>Anteprima</button>
          </li>
          <li>
            <label><input type="radio" name="music-track" disabled /> Traccia 3</label>
            <button type="button" disabled>Anteprima</button>
          </li>
          <li>
            <label><input type="radio" name="music-track" checked disabled /> Nessuna musica</label>
          </li>
        </ul>
      </fieldset>
      <p><a href="#/">Torna alla schermata iniziale</a></p>
    </main>
  `;

  const status = container.querySelector<HTMLElement>("#selection-status");
  if (!status) throw new Error("Markup della schermata avversari incompleto");

  container.querySelectorAll<HTMLInputElement>("input[data-opponent-id]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const id = checkbox.dataset["opponentId"]!;
      const outcome = toggleOpponent(config, id);
      if (!outcome.ok) {
        checkbox.checked = !checkbox.checked; // il browser l'ha già spuntata/tolta: si torna indietro
        status.textContent = BLOCK_MESSAGES[outcome.reason];
        return;
      }
      config = outcome.config;
      saveMatchConfig(window.localStorage, outcome.config);
      status.textContent = "";
    });
  });
};
