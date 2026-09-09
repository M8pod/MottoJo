import { createRouter } from "./ui/router.js";
import { renderExtra } from "./ui/screens/extra.js";
import { renderGame } from "./ui/screens/game.js";
import { renderHome } from "./ui/screens/home.js";
import { renderMatches } from "./ui/screens/matches.js";
import { renderOpponents } from "./ui/screens/opponents.js";
import { renderPlaceholder } from "./ui/screens/placeholder.js";

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
