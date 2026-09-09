import { createRouter } from "./ui/router.js";
import { renderExtra } from "./ui/screens/extra.js";
import { renderGame } from "./ui/screens/game.js";
import { renderHome } from "./ui/screens/home.js";
import { renderMatches } from "./ui/screens/matches.js";
import { renderOpponents } from "./ui/screens/opponents.js";
import { renderPlaceholder } from "./ui/screens/placeholder.js";
import { assetUrl } from "./assetUrl.js";

// Il dorso delle carte è disegnato via CSS (in più punti: mazzo, carte
// coperte, "sbircia" nell'arto): il percorso dipende dal `base` di Vite, non
// componibile in un file .css statico, quindi lo passiamo come custom
// property calcolata qui.
document.documentElement.style.setProperty(
  "--card-back-url",
  `url("${assetUrl("assets/immagini/carte/carta_dorso.png")}")`,
);

const app = document.getElementById("app");
if (!app) throw new Error("Elemento #app non trovato in index.html");

const router = createRouter(app, renderPlaceholder("Pagina non trovata", "Questa schermata non esiste."));

router.register("/", renderHome);
router.register("/opponents", renderOpponents);
router.register("/game", renderGame);
router.register("/game/:id", renderGame);
router.register("/matches", renderMatches);
router.register("/extra", renderExtra);

router.start();
