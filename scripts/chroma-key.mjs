#!/usr/bin/env node
/**
 * Toglie uno sfondo a tinta unita (chroma key) da un'immagine e lo rende
 * davvero trasparente (canale alpha), salvando un PNG. Pensato per le
 * braccia/zampe dei personaggi (punto 11 dello spec): Gemini non garantisce
 * un vero canale alpha, quindi si genera con uno sfondo a tinta unita
 * inconfondibile (default: magenta puro #FF00FF, mai usato nella palette
 * Motto) e lo si toglie qui in modo esatto, invece di affidarsi a un
 * ritaglio "intelligente" indovinato.
 *
 * Uso:
 *   node scripts/chroma-key.mjs <input> <output.png> [--color=#FF00FF] [--tolerance=40] [--feather=25]
 *
 * --tolerance: distanza colore (0-441 circa, spazio RGB) sotto la quale un
 *   pixel è considerato sfondo puro (alpha 0).
 * --feather: fascia di sfumatura oltre la tolleranza in cui l'alpha sale
 *   gradualmente da 0 a 255, per un bordo pulito invece che frastagliato.
 */
import sharp from "sharp";

function parseArgs(argv) {
  const [input, output, ...rest] = argv;
  if (!input || !output) {
    console.error("Uso: node scripts/chroma-key.mjs <input> <output.png> [--color=#FF00FF] [--tolerance=40] [--feather=25]");
    process.exit(1);
  }
  const options = { color: "#FF00FF", tolerance: 40, feather: 25 };
  for (const arg of rest) {
    const m = /^--(color|tolerance|feather)=(.+)$/.exec(arg);
    if (!m) continue;
    const [, key, value] = m;
    options[key] = key === "color" ? value : Number(value);
  }
  return { input, output, ...options };
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return { r, g, b };
}

async function chromaKey({ input, output, color, tolerance, feather }) {
  const target = hexToRgb(color);
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const distance = Math.sqrt((r - target.r) ** 2 + (g - target.g) ** 2 + (b - target.b) ** 2);

    let alpha;
    if (distance <= tolerance) {
      alpha = 0;
    } else if (distance >= tolerance + feather) {
      alpha = 255;
    } else {
      alpha = Math.round(((distance - tolerance) / feather) * 255);
    }
    data[i + 3] = Math.min(data[i + 3], alpha);
  }

  await sharp(data, { raw: { width, height, channels } }).png().toFile(output);
}

const options = parseArgs(process.argv.slice(2));
await chromaKey(options);
console.log(`Fatto: ${options.output} (sfondo ${options.color} tolto, tolleranza ${options.tolerance}, sfumatura ${options.feather})`);
