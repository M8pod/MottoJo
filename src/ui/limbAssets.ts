/**
 * Arto distintivo di ogni avversario virtuale (spec, sezione 2/5): un'unica
 * immagine fissa per personaggio, `id` = stesso id di `OPPONENT_ROSTER`
 * (src/ai/levels.ts). Il giocatore umano non ha un braccio proprio, quindi
 * non compare qui.
 */
import { assetUrl } from "../assetUrl.js";

const LIMB_IMAGE_BY_OPPONENT_ID: Record<string, string> = {
  roberto: assetUrl("assets/immagini/braccia/braccio_roberto.png"),
  elena: assetUrl("assets/immagini/braccia/braccio_elena.png"),
  lorenzo: assetUrl("assets/immagini/braccia/braccio_lorenzo.png"),
  martina: assetUrl("assets/immagini/braccia/braccio_martina.png"),
  graziano: assetUrl("assets/immagini/braccia/braccio_graziano.png"),
  marco: assetUrl("assets/immagini/braccia/gamba_marco.png"),
  roger: assetUrl("assets/immagini/braccia/zampa_roger.png"),
  alessandro: assetUrl("assets/immagini/braccia/braccio_alessandro.png"),
  aurora: assetUrl("assets/immagini/braccia/braccio_aurora.png"),
};

export function limbImageForOpponent(opponentId: string): string | null {
  return LIMB_IMAGE_BY_OPPONENT_ID[opponentId] ?? null;
}
