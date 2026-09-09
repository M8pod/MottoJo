import { defineConfig } from "vite";

// Il sito è pubblicato come GitHub Pages di progetto
// (https://m8pod.github.io/MottoJo/), non alla radice del dominio: senza
// questo base path tutti i riferimenti assoluti a /assets/... punterebbero
// fuori dalla cartella del sito e l'app risulterebbe muta e senza immagini.
// In modalità test (Vitest) resta "/": i test verificano i percorsi sul
// filesystem del progetto, non su un deploy pubblicato con un prefisso.
export default defineConfig(({ mode }) => ({
  base: mode === "test" ? "/" : "/MottoJo/",
}));
