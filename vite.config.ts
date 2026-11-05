import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";

// Elenca ricorsivamente i file pubblicati (percorsi relativi con "/").
function listFiles(dir: string, root = dir): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return listFiles(full, root);
    return [relative(root, full).split("\\").join("/")];
  });
}

// Genera dist/sw.js dal modello sw-template.js con l'elenco reale dei file e
// una versione calcolata sul loro contenuto: ogni pubblicazione con file
// cambiati produce un service worker nuovo, che aggiorna il gioco installato.
function serviceWorkerPlugin(): Plugin {
  let outDir = "dist";
  let rootDir = ".";
  return {
    name: "motto-jo-service-worker",
    apply: "build",
    configResolved(config) {
      rootDir = config.root;
      outDir = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const files = listFiles(outDir).filter((f) => f !== "sw.js" && !f.endsWith(".DS_Store"));
      const hash = createHash("sha256");
      for (const f of files.sort()) {
        hash.update(f);
        hash.update(readFileSync(join(outDir, f)));
      }
      const version = hash.digest("hex").slice(0, 12);
      const isMedia = (f: string) => f.startsWith("assets/audio/") || f.startsWith("assets/immagini/");
      const isIcon = (f: string) => f.startsWith("assets/immagini/icone/");
      const core = ["./", ...files.filter((f) => f !== "index.html" && (!isMedia(f) || isIcon(f)))];
      const rest = files.filter((f) => isMedia(f) && !isIcon(f));
      const template = readFileSync(resolve(rootDir, "sw-template.js"), "utf8");
      const sw = template
        .replace('const VERSION = "__VERSION__";', `const VERSION = "${version}";`)
        .replace("const CORE = __CORE__;", `const CORE = ${JSON.stringify(core)};`)
        .replace("const REST = __REST__;", `const REST = ${JSON.stringify(rest)};`);
      if (sw.includes("= __")) throw new Error("sw-template.js: segnaposto non sostituito.");
      writeFileSync(join(outDir, "sw.js"), sw);
    },
  };
}

// Il sito è pubblicato come GitHub Pages di progetto
// (https://m8pod.github.io/MottoJo/), non alla radice del dominio: senza
// questo base path tutti i riferimenti assoluti a /assets/... punterebbero
// fuori dalla cartella del sito e l'app risulterebbe muta e senza immagini.
// In modalità test (Vitest) resta "/": i test verificano i percorsi sul
// filesystem del progetto, non su un deploy pubblicato con un prefisso.
export default defineConfig(({ mode }) => ({
  base: mode === "test" ? "/" : "/MottoJo/",
  plugins: [serviceWorkerPlugin()],
}));
