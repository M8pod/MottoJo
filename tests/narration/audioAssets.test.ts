import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { OPPONENT_ROSTER } from "../../src/ai/index.js";
import { PHRASES, type PhraseKey } from "../../src/narration/fragments.js";
import {
  MOTTO_JO_TAKES,
  nameAudioUrl,
  numberAudioUrl,
  pauseDurationMs,
  phraseAudioUrl,
  tokenAudioUrl,
} from "../../src/narration/audioAssets.js";
import { name, number, pause, score, text } from "../../src/narration/tokens.js";

const PROJECT_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function assetExists(url: string): boolean {
  return existsSync(join(PROJECT_ROOT, url));
}

describe("phraseAudioUrl", () => {
  it("ogni connettivo del vocabolario fisso ha un file audio esistente sul disco", () => {
    for (const key of Object.keys(PHRASES) as PhraseKey[]) {
      if (key === "motto_jo" || key === "tocca_a_te") continue; // frasi fisse, gestite a parte sotto
      const url = phraseAudioUrl(key);
      expect(assetExists(url), `manca il file per "${key}": ${url}`).toBe(true);
    }
  });

  it("art_un è l'unico rimasto in .wav (nessun encoder mp3 disponibile per convertirlo)", () => {
    expect(phraseAudioUrl("art_un")).toBe("/assets/audio/frammenti/connettivi/art_un.wav");
    expect(assetExists(phraseAudioUrl("art_un"))).toBe(true);
  });

  it("tocca_a_te punta al file unico nelle frasi fisse", () => {
    const url = phraseAudioUrl("tocca_a_te");
    expect(url).toBe("/assets/audio/frasi_fisse/tocca_a_te.mp3");
    expect(assetExists(url)).toBe(true);
  });

  it("motto_jo sceglie una delle 3 varianti in base all'rng, tutte esistenti sul disco", () => {
    for (const take of MOTTO_JO_TAKES) {
      expect(assetExists(take), `manca il file: ${take}`).toBe(true);
    }
    expect(phraseAudioUrl("motto_jo", () => 0)).toBe(MOTTO_JO_TAKES[0]);
    expect(phraseAudioUrl("motto_jo", () => 0.999)).toBe(MOTTO_JO_TAKES[2]);
  });
});

describe("numberAudioUrl", () => {
  it("copre l'intervallo dei valori carta (-2..12), file esistenti", () => {
    for (let v = -2; v <= 12; v += 1) {
      const url = numberAudioUrl(v);
      expect(assetExists(url), `manca il file per il valore ${v}: ${url}`).toBe(true);
    }
  });

  it("toglie l'accento su 'tré' nei composti per far combaciare il nome file (es. quarantatré -> num_quarantatre.mp3)", () => {
    expect(numberAudioUrl(43)).toBe("/assets/audio/frammenti/numeri/num_quarantatre.mp3");
    expect(assetExists(numberAudioUrl(43))).toBe(true);
    expect(assetExists(numberAudioUrl(173))).toBe(true);
  });

  it("copre un campione di punteggi generici fino a 200, file esistenti", () => {
    for (const v of [0, 8, 68, 100, 105, 152, 185, 200]) {
      expect(assetExists(numberAudioUrl(v)), `manca il file per il punteggio ${v}`).toBe(true);
    }
  });
});

describe("nameAudioUrl", () => {
  it("ogni avversario del roster fisso ha un file audio esistente sul disco", () => {
    for (const opponent of OPPONENT_ROSTER) {
      const url = nameAudioUrl(opponent.name);
      expect(assetExists(url), `manca il file per "${opponent.name}": ${url}`).toBe(true);
    }
  });
});

describe("tokenAudioUrl", () => {
  it("risolve ogni tipo di token, null per una pausa", () => {
    expect(tokenAudioUrl(name("Roberto"))).toBe(nameAudioUrl("Roberto"));
    expect(tokenAudioUrl(number(7))).toBe(numberAudioUrl(7));
    expect(tokenAudioUrl(score(43))).toBe(numberAudioUrl(43));
    expect(tokenAudioUrl(text("pos_colonna"))).toBe(phraseAudioUrl("pos_colonna"));
    expect(tokenAudioUrl(pause(","))).toBeNull();
  });
});

describe("pauseDurationMs", () => {
  it("una pausa di fine frase dura più a lungo di una virgola", () => {
    expect(pauseDurationMs(".")).toBeGreaterThan(pauseDurationMs(","));
    expect(pauseDurationMs(":")).toBeGreaterThan(pauseDurationMs(","));
  });
});
