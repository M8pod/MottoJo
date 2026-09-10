import type { CardValue } from "../engine/types.js";

/**
 * Implementa esattamente l'elenco in `motto-jo-frasi-narrazione.md`
 * (sezioni 1 e 2) alla radice del progetto: se una frase cambia va
 * aggiornata in entrambi i posti.
 */
export const NUMBER_WORDS: Record<CardValue, string> = {
  [-2]: "meno due",
  [-1]: "meno uno",
  0: "zero",
  1: "uno",
  2: "due",
  3: "tre",
  4: "quattro",
  5: "cinque",
  6: "sei",
  7: "sette",
  8: "otto",
  9: "nove",
  10: "dieci",
  11: "undici",
  12: "dodici",
};

export const PHRASES = {
  fonte_mazzo: "pesca dal mazzo",
  fonte_scarti: "prende dagli scarti",
  az_scarta: "scarta un",
  az_tiene: "tiene un",
  az_sostituisce: "sostituisce",
  art_un: "un",
  pos_riga: "riga",
  pos_colonna: "colonna",
  esito_scopre: "Scopre",
  esito_era_coperta: "era coperta",
  esito_ora_e_un: "ora è un",
  esito_li_cera_un: "Lì c'era un",
  esito_era_coperta_ora_scartata: "Era coperta, ora scartata.",
  esito_ora_scartato: "ora scartato.",
  ess_scambia: "scambia",
  ess_con_un: "con un",
  ess_e_scopre: "e scopre",
  colonna_completa: "completa la colonna",
  colonna_completa_tu: "Completi la colonna",
  colonna_annullata: "annullata.",
  chiusura_scopre_ultima: "scopre l'ultima carta, ultimo turno per tutti gli altri.",
  chiusura_scopri_ultima_tu: "Scopri l'ultima carta, ultimo turno per tutti gli altri.",
  punti_altrui: "Punti dalle carte scoperte,",
  punti_propri: "Punti dalle tue carte scoperte:",
  totale: "totale",
  coperta: "coperta",
  deck_di: "Deck di",
  il_tuo_deck: "il tuo Deck",
  ora_ascolti: "Ora ascolti",
  hai_pescato: "Hai pescato,",
  parola_punti: "punti",
  inizia_manche: "Inizia",
  inizia_manche_tu: "Inizi tu,",
  inizio_con: "con",
  // Grafia fonetica apposta per la sintesi vocale: "Jo" letto da una voce
  // italiana rischia una pronuncia errata, "Gio" garantisce il suono giusto.
  motto_jo: "Motto Gioooooo!",
  tocca_a_te: "Tocca a te.",
  invito_scopri_due: "Scopri due carte del tuo Deck per iniziare.",
} as const;

export type PhraseKey = keyof typeof PHRASES;
