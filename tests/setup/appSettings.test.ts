import { describe, expect, it } from "vitest";
import {
  defaultAppSettings,
  humanDisplayName,
  loadAppSettings,
  saveAppSettings,
  type AppSettings,
  type ConfigStorage,
} from "../../src/setup/appSettings.js";

function memoryStorage(): ConfigStorage {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => map.set(key, value),
  };
}

describe("defaultAppSettings", () => {
  it("musica al 10%, effetti e voce al 100%, campi testuali vuoti tranne il link donazioni", () => {
    const settings = defaultAppSettings();
    expect(settings.volumes).toEqual({ music: 10, sfx: 100, narration: 100 });
    expect(settings.humanPlayerName).toBe("");
    expect(settings.bio).toBe("");
    expect(settings.donationUrl).toBe("https://www.paypal.me/MottoPodcast");
  });
});

describe("loadAppSettings / saveAppSettings", () => {
  it("senza nulla di salvato restituisce il default", () => {
    expect(loadAppSettings(memoryStorage())).toEqual(defaultAppSettings());
  });

  it("fa il giro completo salvataggio → lettura", () => {
    const storage = memoryStorage();
    const settings: AppSettings = {
      humanPlayerName: "Marta",
      volumes: { music: 40, sfx: 60, narration: 80 },
      bio: "Appassionata di Skyjo.",
      email: "marta@example.com",
      podcastUrl: "https://example.com/podcast",
      donationUrl: "https://paypal.me/marta",
      limbAnimationSpeed: "veloce",
    };
    saveAppSettings(storage, settings);
    expect(loadAppSettings(storage)).toEqual(settings);
  });

  it("con dati corrotti o non validi in memoria, ricade sul default", () => {
    const corrupted = memoryStorage();
    corrupted.setItem("motto-jo:app-settings", "{non è json");
    expect(loadAppSettings(corrupted)).toEqual(defaultAppSettings());

    const invalid = memoryStorage();
    invalid.setItem("motto-jo:app-settings", JSON.stringify({ humanPlayerName: "Marta" }));
    expect(loadAppSettings(invalid)).toEqual(defaultAppSettings());
  });

  it("impostazioni salvate prima dell'introduzione di limbAnimationSpeed restano valide (default 'lenta' applicato, resto preservato)", () => {
    const storage = memoryStorage();
    const { limbAnimationSpeed: _omit, ...withoutSpeed } = defaultAppSettings();
    storage.setItem("motto-jo:app-settings", JSON.stringify({ ...withoutSpeed, humanPlayerName: "Marta" }));
    expect(loadAppSettings(storage)).toEqual({
      ...defaultAppSettings(),
      humanPlayerName: "Marta",
      limbAnimationSpeed: "lenta",
    });
  });
});

describe("humanDisplayName", () => {
  it("usa il nome personalizzato se impostato (spazi tolti)", () => {
    const settings = { ...defaultAppSettings(), humanPlayerName: "  Marta  " };
    expect(humanDisplayName(settings, "Tu")).toBe("Marta");
  });

  it("ricade sul fallback se il nome è vuoto o solo spazi", () => {
    expect(humanDisplayName(defaultAppSettings(), "Tu")).toBe("Tu");
    const blank = { ...defaultAppSettings(), humanPlayerName: "   " };
    expect(humanDisplayName(blank, "Tu")).toBe("Tu");
  });
});
