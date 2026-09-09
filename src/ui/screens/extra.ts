import { loadAppSettings, saveAppSettings, type AppSettings } from "../../setup/appSettings.js";
import { ICONS } from "../icons.js";
import type { RouteRenderer } from "../router.js";

/**
 * Schermata Extra (spec, sezione 6 / punto 10): nome del giocatore umano
 * (mai pronunciato dalla voce narrante), volumi separati, bio/contatti.
 * Salvataggio automatico a ogni modifica, stessa convenzione già scelta per
 * "Scegli gli avversari" — niente pulsante "Salva" a parte.
 *
 * Contiene anche una tendina (`<details>`, nativamente accessibile) con la
 * storia fissa di perché l'app è nata — testo statico dell'autore, non
 * l'editabile "Breve biografia" qui sopra. Le emoji nel testo sono
 * `aria-hidden` (visibili solo a schermo) per non far leggere a VoiceOver
 * una sequenza di nomi di emoji intercalati al testo.
 */
export const renderExtra: RouteRenderer = (container) => {
  let settings = loadAppSettings(window.localStorage);

  container.innerHTML = `
    <header class="app-header">
      <h1>Extra</h1>
    </header>
    <main>
      <p id="save-status" aria-live="polite"></p>

      <fieldset>
        <legend>Il tuo nome</legend>
        <label for="human-name">Nome del giocatore umano (mai pronunciato dalla voce, solo a schermo e nei riepiloghi)</label>
        <input type="text" id="human-name" value="${escapeHtml(settings.humanPlayerName)}" />
      </fieldset>

      <fieldset>
        <legend>Volumi</legend>
        <p>
          <label for="vol-music">Musica di sottofondo (${settings.volumes.music}%) — a 0 la musica è disattivata del tutto</label><br />
          <input type="range" id="vol-music" min="0" max="100" value="${settings.volumes.music}" />
        </p>
        <p>
          <label for="vol-sfx">Suoni di gioco (${settings.volumes.sfx}%)</label><br />
          <input type="range" id="vol-sfx" min="0" max="100" value="${settings.volumes.sfx}" />
        </p>
        <p>
          <label for="vol-narration">Voce narrante (${settings.volumes.narration}%)</label><br />
          <input type="range" id="vol-narration" min="0" max="100" value="${settings.volumes.narration}" />
        </p>
      </fieldset>

      <fieldset>
        <legend>Chi sono / contatti</legend>
        <p>
          <label for="bio">Breve biografia</label><br />
          <textarea id="bio" rows="4">${escapeHtml(settings.bio)}</textarea>
        </p>
        <p>
          <label for="email">Email di contatto</label><br />
          <input type="email" id="email" value="${escapeHtml(settings.email)}" />
        </p>
        <p>
          <label for="podcast-url">Link al podcast</label><br />
          <input type="url" id="podcast-url" value="${escapeHtml(settings.podcastUrl)}" />
        </p>
        <p>
          <label for="donation-url">Link per donazioni PayPal</label><br />
          <input type="url" id="donation-url" value="${escapeHtml(settings.donationUrl)}" />
        </p>
      </fieldset>

      <details class="app-story">
        <summary>Perché ho creato questo gioco</summary>
        <p>
          Questo gioco nasce tra le onde del Mediterraneo durante una crociera di Motto on Tour
          <span aria-hidden="true">🚢🌊</span>
          In quei giorni di viaggio Martina e Lorenzo mi hanno fatto scoprire un gioco di carte semplice e davvero travolgente
          <span aria-hidden="true">🃏✨</span>
        </p>
        <p>
          C'era solo un piccolo ostacolo: non vedendo le carte, a ogni turno dovevo farmi descrivere cosa c'era nei mazzi e sul tavolo. Questo continuo passaggio rallentava il ritmo e toglieva immediatezza alle partite
          <span aria-hidden="true">⏳👀</span>
        </p>
        <p>
          Così ho deciso di creare questa versione in audiogioco, pensata per essere del tutto accessibile e fluida per chiunque
          <span aria-hidden="true">🎧🎮</span>
          Il mio desiderio è che possiate divertirvi, ridere e sfidarvi con la stessa spensieratezza che ha accompagnato le mie giornate mentre solcavamo il mare
          <span aria-hidden="true">🎲☀️</span>
        </p>
      </details>

      <details class="app-story">
        <summary>Chi sono</summary>
        <p>
          Sono Roberto Lachin, blind judoka e blind podcaster
          <span aria-hidden="true">🥋🎙️</span>
          Ho ideato e conduco, insieme alla ballerina Elena Travaini, il Motto Podcast, un progetto che negli anni ha ricevuto diversi riconoscimenti internazionali
          <span aria-hidden="true">🏆🌍</span>
        </p>
        <p>
          Se vi va di seguirmi o scambiare due chiacchiere, fate un salto su <a href="https://mottopodcast.org">mottopodcast.org</a> oppure scrivetemi direttamente a <a href="mailto:mottopod@gmail.com">mottopod@gmail.com</a>
          <span aria-hidden="true">🌐✉️</span>
        </p>
      </details>

      <div id="donation-cta"></div>

      <p><a href="#/">Torna alla schermata iniziale</a></p>
    </main>
  `;

  const $ = <T extends HTMLElement>(selector: string): T => {
    const el = container.querySelector<T>(selector);
    if (!el) throw new Error(`Elemento mancante nella schermata Extra: ${selector}`);
    return el;
  };

  function persist(next: AppSettings): void {
    settings = next;
    saveAppSettings(window.localStorage, settings);
    $("#save-status").textContent = "Salvato.";
  }

  /** Invito alla donazione, in fondo alla schermata: il pulsante compare solo
   * se sopra è stato impostato un link vero (mai un URL inventato qui — punta
   * sempre e solo a quello che l'utente stesso ha scritto nel campo "Link
   * per donazioni PayPal"). */
  function renderDonationCta(): void {
    const el = $("#donation-cta");
    const url = settings.donationUrl.trim();
    el.innerHTML = `
      <p>Ti è piaciuto questo audiogioco e ne vorresti altri? Fai una donazione per aiutarmi nella prossima avventura!</p>
      ${
        url
          ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="icon-btn icon-btn--primary">${ICONS.dona}<span>Dona con PayPal</span></a>`
          : `<p><em>Aggiungi il tuo link qui sopra, in "Link per donazioni PayPal", per far comparire qui il pulsante.</em></p>`
      }
    `;
  }

  $<HTMLInputElement>("#human-name").addEventListener("change", (e) => {
    persist({ ...settings, humanPlayerName: (e.target as HTMLInputElement).value });
  });

  const volumeLabels: Record<"music" | "sfx" | "narration", string> = {
    music: "Musica di sottofondo",
    sfx: "Suoni di gioco",
    narration: "Voce narrante",
  };
  (Object.keys(volumeLabels) as (keyof typeof volumeLabels)[]).forEach((key) => {
    const input = $<HTMLInputElement>(`#vol-${key}`);
    input.addEventListener("input", (e) => {
      const value = Number((e.target as HTMLInputElement).value);
      persist({ ...settings, volumes: { ...settings.volumes, [key]: value } });
      const label = container.querySelector<HTMLLabelElement>(`label[for="${input.id}"]`)!;
      const suffix = key === "music" ? " — a 0 la musica è disattivata del tutto" : "";
      label.textContent = `${volumeLabels[key]} (${value}%)${suffix}`;
    });
  });

  $<HTMLTextAreaElement>("#bio").addEventListener("change", (e) => {
    persist({ ...settings, bio: (e.target as HTMLTextAreaElement).value });
  });
  $<HTMLInputElement>("#email").addEventListener("change", (e) => {
    persist({ ...settings, email: (e.target as HTMLInputElement).value });
  });
  $<HTMLInputElement>("#podcast-url").addEventListener("change", (e) => {
    persist({ ...settings, podcastUrl: (e.target as HTMLInputElement).value });
  });
  $<HTMLInputElement>("#donation-url").addEventListener("change", (e) => {
    persist({ ...settings, donationUrl: (e.target as HTMLInputElement).value });
    renderDonationCta();
  });

  renderDonationCta();
};

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
