import type { RouteRenderer } from "../router.js";

/** Schermata segnaposto per i punti dell'ordine dei lavori non ancora costruiti. */
export function renderPlaceholder(title: string, note: string): RouteRenderer {
  return (container) => {
    container.innerHTML = `
      <header class="app-header">
        <h1>${title}</h1>
      </header>
      <main>
        <p>${note}</p>
        <p><a href="#/">Torna alla schermata iniziale</a></p>
      </main>
    `;
  };
}
