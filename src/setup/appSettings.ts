/** Sottoinsieme di localStorage effettivamente usato qui, per poter testare senza un DOM. */
export interface ConfigStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface Volumes {
  /** 0-100. Musica di sottofondo: applicata davvero (src/ui/musicPlayer.ts). Default basso (10) apposta —
   * mettere a 0 dalle opzioni disattiva del tutto la musica, come richiesto dall'utente. */
  readonly music: number;
  /** 0-100. Suoni di gioco: applicato davvero (src/ui/sfxPlayer.ts). */
  readonly sfx: number;
  /** 0-100. Voce narrante: applicata davvero alla riproduzione dei frammenti (src/ui/narrationPlayer.ts). */
  readonly narration: number;
}

/** Velocità dell'animazione braccio/zampa/gamba dell'avversario in turno (spec sezione 5):
 * l'utente ha segnalato il movimento di default troppo veloce da notare — "lenta" è ora il
 * default, "veloce" resta disponibile per chi la preferisce più rapida (src/ui/limbAnimation.ts). */
export type LimbAnimationSpeed = "lenta" | "veloce";

export interface AppSettings {
  /** Testo libero, mai pronunciato dalla voce narrante (spec, sezione "Extra"): solo per visualizzazione e riepiloghi. */
  readonly humanPlayerName: string;
  readonly volumes: Volumes;
  readonly bio: string;
  readonly email: string;
  readonly podcastUrl: string;
  readonly donationUrl: string;
  readonly limbAnimationSpeed: LimbAnimationSpeed;
}

export function defaultAppSettings(): AppSettings {
  return {
    humanPlayerName: "",
    volumes: { music: 10, sfx: 100, narration: 100 },
    bio: "",
    email: "",
    podcastUrl: "",
    // Preso dalla pagina "Supporto" di mottopodcast.org (connettore WordPress.com,
    // su richiesta esplicita dell'utente) — non un URL inventato qui.
    donationUrl: "https://www.paypal.me/MottoPodcast",
    limbAnimationSpeed: "lenta",
  };
}

function isVolumes(value: unknown): value is Volumes {
  if (typeof value !== "object" || value === null) return false;
  const { music, sfx, narration } = value as Partial<Volumes>;
  return [music, sfx, narration].every((v) => typeof v === "number" && v >= 0 && v <= 100);
}

function isAppSettings(value: unknown): value is AppSettings {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<AppSettings>;
  return (
    typeof candidate.humanPlayerName === "string" &&
    isVolumes(candidate.volumes) &&
    typeof candidate.bio === "string" &&
    typeof candidate.email === "string" &&
    typeof candidate.podcastUrl === "string" &&
    typeof candidate.donationUrl === "string"
  );
}

const STORAGE_KEY = "motto-jo:app-settings";

export function loadAppSettings(storage: ConfigStorage): AppSettings {
  const raw = storage.getItem(STORAGE_KEY);
  if (raw === null) return defaultAppSettings();
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isAppSettings(parsed)) return defaultAppSettings();
    // `limbAnimationSpeed` è un campo aggiunto dopo: non richiesto da
    // `isAppSettings` apposta, così le impostazioni salvate prima della sua
    // introduzione restano valide (nome, volumi, bio...) invece di essere
    // scartate in blocco — qui si applica solo il default mancante.
    const limbAnimationSpeed = parsed.limbAnimationSpeed === "veloce" ? "veloce" : "lenta";
    return { ...parsed, limbAnimationSpeed };
  } catch {
    return defaultAppSettings();
  }
}

export function saveAppSettings(storage: ConfigStorage, settings: AppSettings): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

/** Il nome da mostrare per il giocatore umano: quello personalizzato se impostato, altrimenti il default "Tu". */
export function humanDisplayName(settings: AppSettings, fallback: string): string {
  const trimmed = settings.humanPlayerName.trim();
  return trimmed === "" ? fallback : trimmed;
}
