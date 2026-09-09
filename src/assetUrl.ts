/**
 * Su GitHub Pages l'app non è servita dalla radice del dominio (vedi
 * vite.config.ts, `base`), quindi ogni riferimento a un file statico in
 * `assets/` deve passare da qui invece di usare un percorso assoluto
 * "/assets/..." scritto a mano.
 */
export function assetUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path}`;
}
