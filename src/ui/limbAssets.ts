/**
 * Arto distintivo di ogni avversario virtuale (spec, sezione 2/5): un'unica
 * immagine fissa per personaggio, `id` = stesso id di `OPPONENT_ROSTER`
 * (src/ai/levels.ts). Il giocatore umano non ha un braccio proprio, quindi
 * non compare qui.
 */
const LIMB_IMAGE_BY_OPPONENT_ID: Record<string, string> = {
  roberto: "/assets/immagini/braccia/braccio_roberto.png",
  elena: "/assets/immagini/braccia/braccio_elena.png",
  lorenzo: "/assets/immagini/braccia/braccio_lorenzo.png",
  martina: "/assets/immagini/braccia/braccio_martina.png",
  graziano: "/assets/immagini/braccia/braccio_graziano.png",
  marco: "/assets/immagini/braccia/gamba_marco.png",
  roger: "/assets/immagini/braccia/zampa_roger.png",
  alessandro: "/assets/immagini/braccia/braccio_alessandro.png",
  aurora: "/assets/immagini/braccia/braccio_aurora.png",
};

export function limbImageForOpponent(opponentId: string): string | null {
  return LIMB_IMAGE_BY_OPPONENT_ID[opponentId] ?? null;
}
