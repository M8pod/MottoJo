import type { RouteRenderer } from "../router.js";
import { assetUrl } from "../../assetUrl.js";

/**
 * Schermata iniziale (spec, sezione 6): nome del gioco, copertina, e i
 * quattro pulsanti. "Gioca subito" porta direttamente alla schermata di
 * gioco (punto 8), che risolve da sé l'ultima configurazione salvata (o il
 * default Roberto livello 5 al primissimo avvio).
 */
export const renderHome: RouteRenderer = (container) => {
  container.innerHTML = `
    <header class="app-header">
      <h1>Motto Jo</h1>
    </header>
    <main>
      <img class="cover" src="${assetUrl("assets/immagini/copertina-motto-jo.png")}" alt="Logo di Motto Jo: una grande M verde menta cicciottosa dal contorno nero, con la parola Jo in corsivo giallo fluo sovrapposta alla sua gamba destra" />
      <nav aria-label="Menu principale">
        <ul class="menu">
          <li><a href="#/game">Gioca subito</a></li>
          <li><a href="#/opponents">Scegli gli avversari</a></li>
          <li><a href="#/matches">Le tue partite</a></li>
          <li><a href="#/extra">Extra</a></li>
        </ul>
      </nav>
    </main>
  `;
};
