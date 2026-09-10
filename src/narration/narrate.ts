import type { ColumnClearedEvent, PlayingStartedEvent, RoundClosedEvent, RoundEvent, MoveEvent } from "../state/types.js";
import { name, number, pause, score, text, type NarrationToken } from "./tokens.js";

export type Verbosity = "essenziale" | "dettagliata";

export interface NarrationContext {
  readonly verbosity: Verbosity;
  playerName(playerIndex: number): string;
  isHuman(playerIndex: number): boolean;
}

/** Riga/colonna sono 0-based nel motore, 1-based nella narrazione ("riga due colonna uno"). */
const spoken = (zeroBased: number) => (zeroBased + 1) as 1 | 2 | 3 | 4;

function narrateMove(event: MoveEvent, ctx: NarrationContext): NarrationToken[] | null {
  // Il turno del giocatore umano non si narra mai: lo decide da sé coi pulsanti (spec, sezione 3).
  if (ctx.isHuman(event.playerIndex)) {
    return null;
  }
  const who = name(ctx.playerName(event.playerIndex));

  if (event.action === "discard") {
    if (ctx.verbosity === "dettagliata") {
      return [
        who,
        text("fonte_mazzo"),
        pause(","),
        text("az_scarta"),
        number(event.discardedValue),
        pause("."),
        text("esito_scopre"),
        text("pos_riga"),
        number(spoken(event.row)),
        text("pos_colonna"),
        number(spoken(event.column)),
        pause(":"),
        text("esito_era_coperta"),
        pause(","),
        text("esito_ora_e_un"),
        number(event.revealedValue),
        pause("."),
      ];
    }
    return [
      who,
      text("az_scarta"),
      number(event.discardedValue),
      text("ess_e_scopre"),
      text("pos_riga"),
      number(spoken(event.row)),
      text("pos_colonna"),
      number(spoken(event.column)),
      pause(":"),
      text("art_un"),
      number(event.revealedValue),
      pause("."),
    ];
  }

  // action === "replace"
  if (ctx.verbosity === "dettagliata") {
    const sourceTokens: NarrationToken[] =
      event.source === "deck"
        ? [text("fonte_mazzo"), pause(","), text("az_tiene"), number(event.placedValue)]
        : [text("fonte_scarti"), text("art_un"), number(event.placedValue)];
    const previousTokens: NarrationToken[] = event.previous.faceUp
      ? [text("esito_li_cera_un"), number(event.previous.value), pause(","), text("esito_ora_scartato")]
      : [text("esito_era_coperta_ora_scartata")];

    return [
      who,
      ...sourceTokens,
      pause(","),
      text("az_sostituisce"),
      text("pos_riga"),
      number(spoken(event.row)),
      text("pos_colonna"),
      number(spoken(event.column)),
      pause("."),
      ...previousTokens,
    ];
  }
  return [
    who,
    text("ess_scambia"),
    text("pos_riga"),
    number(spoken(event.row)),
    text("pos_colonna"),
    number(spoken(event.column)),
    text("ess_con_un"),
    number(event.placedValue),
    pause("."),
  ];
}

function narrateColumnCleared(event: ColumnClearedEvent, ctx: NarrationContext): NarrationToken[] {
  const columnTokens: NarrationToken[] = ctx.isHuman(event.playerIndex)
    ? [text("colonna_completa_tu")]
    : [name(ctx.playerName(event.playerIndex)), text("colonna_completa")];
  return [text("motto_jo"), ...columnTokens, number(spoken(event.column)), pause(","), text("colonna_annullata")];
}

function narrateRoundClosed(event: RoundClosedEvent, ctx: NarrationContext): NarrationToken[] {
  return ctx.isHuman(event.playerIndex)
    ? [text("chiusura_scopri_ultima_tu")]
    : [name(ctx.playerName(event.playerIndex)), text("chiusura_scopre_ultima")];
}

/** A inizio manche, dopo che tutti hanno scoperto le due carte iniziali: chi inizia e con quanti punti scoperti. */
function narratePlayingStarted(event: PlayingStartedEvent, ctx: NarrationContext): NarrationToken[] {
  const openingTokens: NarrationToken[] = ctx.isHuman(event.playerIndex)
    ? [text("inizia_manche_tu")]
    : [text("inizia_manche"), name(ctx.playerName(event.playerIndex)), pause(",")];
  return [...openingTokens, text("inizio_con"), score(event.points), text("parola_punti"), pause(".")];
}

/**
 * Genera i token da narrare per un evento della manche, o null se quell'evento
 * non va narrato automaticamente (scoperta iniziale; turno del giocatore umano).
 */
export function narrateEvent(event: RoundEvent, ctx: NarrationContext): NarrationToken[] | null {
  switch (event.type) {
    case "initial-reveal":
      return null;
    case "move":
      return narrateMove(event, ctx);
    case "column-cleared":
      return narrateColumnCleared(event, ctx);
    case "round-closed":
      return narrateRoundClosed(event, ctx);
    case "handoff-to-human":
      return [text("tocca_a_te")];
    case "playing-started":
      return narratePlayingStarted(event, ctx);
  }
}

/** Frase del pulsante "somma punti": self-referenziale sul proprio Deck, con nome su quello altrui. */
export function narrateScoreQuery(playerName: string | null, total: number): NarrationToken[] {
  if (playerName === null) {
    return [text("punti_propri"), text("totale"), score(total), text("parola_punti"), pause(".")];
  }
  return [
    text("punti_altrui"),
    name(playerName),
    pause(":"),
    text("totale"),
    score(total),
    text("parola_punti"),
    pause("."),
  ];
}
