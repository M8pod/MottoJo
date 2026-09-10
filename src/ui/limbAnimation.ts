/**
 * Animazione del braccio/zampa/gamba dell'avversario in turno (spec,
 * sezione 5): compare dal bordo inferiore dello schermo, va al mazzo o agli
 * scarti dove preleva la carta (che si intravede sotto la mano/zampa/piede),
 * poi la porta davvero fino alla destinazione — la cella del suo Deck da
 * sostituire (ora visibile nella sezione "Deck in ascolto", a cui la
 * schermata di gioco passa automaticamente non appena inizia il suo turno)
 * oppure gli scarti per uno scarto diretto — e infine torna verso il basso
 * e scompare. Puramente decorativa — `aria-hidden`, mai l'unica fonte di
 * informazione: chi ascolta ha già tutto dalla narrazione.
 *
 * `position: fixed` rispetto alla finestra (non alla pagina): il "bordo
 * inferiore dello schermo" è letteralmente quello del viewport, e restare
 * ancorati al viewport invece che a un contenitore della pagina evita che
 * l'animazione finisca fuori vista se nel frattempo il focus da tastiera
 * sposta lo scroll (es. verso il messaggio di turno) — capitato durante la
 * verifica in un browser headless.
 *
 * Non testato con vitest (solo DOM/browser reale), verificato con
 * screenshot/misure in un browser headless — stessa convenzione di
 * `narrationPlayer.ts`.
 */

export interface LimbPeek {
  readonly kind: "covered" | "value";
  readonly value?: number;
  readonly band?: string;
}

export interface LimbMove {
  readonly imageSrc: string;
  readonly getSourceEl: () => HTMLElement | null;
  /** Cella del Deck dell'avversario (ora visibile, "Deck in ascolto") per una
   * sostituzione, o la pila scarti per uno scarto diretto — sempre una
   * destinazione vera, mai un semplice ritiro verso il basso. */
  readonly getDestinationEl: () => HTMLElement | null;
  readonly peek: LimbPeek;
  /** Richiamato appena l'arto arriva alla fonte (mazzo/scarti) — usato per il
   * suono di pesca/presa, sincronizzato con quello che si vede. */
  readonly onArrive?: () => void;
  /** Richiamato quando la carta arriva a destinazione — usato per il suono
   * di scarto e un piccolo lampeggio sulla cella/pila coinvolta, che nel
   * frattempo si è già aggiornata davvero. */
  readonly onSettle?: () => void;
}

export interface LimbAnimator {
  enqueue(move: LimbMove): void;
  /**
   * Accoda una funzione invece di un'animazione: viene richiamata solo dopo
   * che tutte le animazioni accodate PRIMA di questa chiamata sono finite
   * di riprodursi. Serve per rimettere la vista sul proprio Deck (e suonare
   * "Passaggio di mano") solo a turno IA davvero concluso a schermo, non
   * subito quando lo stato cambia — altrimenti, essendo il cambio di stato
   * sincrono, si tornerebbe alla propria vista nello stesso istante in cui
   * si passa a quella dell'avversario, e il suo Deck non si vedrebbe mai
   * davvero (bug trovato controllando in un browser headless: la sezione
   * "Deck in ascolto" restava sempre nascosta).
   */
  runAfterQueue(fn: () => void): void;
  /** Rimuove gli elementi dal DOM — da chiamare quando si lascia la schermata di gioco. */
  destroy(): void;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Moltiplicatore sulle durate (sia le attese JS sotto, sia le transizioni
 * CSS di posizione/opacità — vedi `--limb-move-ms`/`--limb-opacity-ms` in
 * `src/styles.css`): l'utente ha segnalato il movimento di default troppo
 * veloce da notare durante il turno di un avversario. "lenta" (default,
 * `src/setup/appSettings.ts`) rallenta rispetto ai valori originari sotto;
 * "veloce" li rende leggermente più rapidi di quei valori originari.
 */
const SPEED_MULTIPLIER: Record<"lenta" | "veloce", number> = {
  lenta: 1.6,
  veloce: 0.9,
};

export function createLimbAnimator(
  referenceCardEl: () => HTMLElement | null,
  speed: "lenta" | "veloce" = "lenta",
): LimbAnimator {
  const multiplier = SPEED_MULTIPLIER[speed];
  const ms = (base: number): number => Math.round(base * multiplier);

  const figure = document.createElement("img");
  figure.className = "limb-figure";
  figure.alt = "";
  figure.setAttribute("aria-hidden", "true");
  figure.style.opacity = "0";
  figure.style.setProperty("--limb-move-ms", `${ms(480)}ms`);
  figure.style.setProperty("--limb-opacity-ms", `${ms(250)}ms`);
  document.body.appendChild(figure);

  const peek = document.createElement("div");
  peek.className = "limb-peek";
  peek.setAttribute("aria-hidden", "true");
  peek.style.opacity = "0";
  peek.style.setProperty("--limb-move-ms", `${ms(480)}ms`);
  peek.style.setProperty("--limb-opacity-ms", `${ms(200)}ms`);
  document.body.appendChild(peek);

  type QueueItem = { readonly kind: "move"; readonly move: LimbMove } | { readonly kind: "callback"; readonly fn: () => void };
  const queue: QueueItem[] = [];
  let running = false;

  function figureWidth(): number {
    const cardEl = referenceCardEl();
    const cardWidth = cardEl ? cardEl.getBoundingClientRect().width : 70;
    return cardWidth * 1.1;
  }

  function centerOf(target: HTMLElement): { x: number; y: number } {
    const rect = target.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }

  function originPoint(): { x: number; y: number } {
    return { x: window.innerWidth / 2, y: window.innerHeight + 40 };
  }

  /** Posiziona l'arto in modo che il punto "presa" (vicino alla mano/zampa,
   * cioè vicino alla cima dell'immagine — tutte ritagliate così) coincida col
   * bersaglio, non il centro dell'intera immagine: altrimenti, essendo
   * l'arto molto più alto che largo, metà finirebbe sotto il bersaglio e
   * potrebbe coprire contenuto vero più in basso. */
  function placeFigureAt(point: { x: number; y: number }): void {
    const rect = figure.getBoundingClientRect();
    const grabAnchorFraction = 0.05;
    figure.style.left = `${point.x - rect.width / 2}px`;
    figure.style.top = `${point.y - rect.height * grabAnchorFraction}px`;
  }

  function positionPeekNearFigureTop(): void {
    const figureRect = figure.getBoundingClientRect();
    peek.style.left = `${figureRect.left + figureRect.width * 0.28}px`;
    peek.style.top = `${figureRect.top + figureRect.height * 0.05}px`;
  }

  function applyPeekContent(spec: LimbPeek, width: number): void {
    const w = width * 0.42;
    const h = w * 1.4;
    peek.style.width = `${w}px`;
    peek.style.height = `${h}px`;
    if (spec.kind === "covered") {
      peek.className = "limb-peek limb-peek--covered";
      peek.textContent = "";
      peek.style.borderColor = "";
    } else {
      peek.className = "limb-peek limb-peek--value";
      peek.textContent = String(spec.value);
      peek.style.borderColor = spec.band ? `var(--band-${spec.band})` : "";
    }
  }

  async function playOne(move: LimbMove): Promise<void> {
    // Importante: non catturare l'elemento bersaglio una volta sola e
    // riusarlo dopo un `await` — `renderTableArea()` ricrea i pulsanti
    // mazzo/scarti con `innerHTML`, quindi un riferimento preso prima di
    // un'attesa potrebbe puntare a un nodo ormai staccato dal DOM (che
    // `getBoundingClientRect()` misura come tutto zero). Si richiama sempre
    // `getSourceEl`/`getDestinationEl` appena prima di leggere la posizione.
    if (!move.getSourceEl()) return;

    const width = figureWidth();
    figure.style.width = `${width}px`;
    figure.src = move.imageSrc;
    await sleep(20);

    const origin = originPoint();
    placeFigureAt(origin);
    figure.style.opacity = "0";
    void figure.offsetHeight;

    const sourceEl = move.getSourceEl();
    if (!sourceEl) return;
    // "Deck in ascolto" può stare più in basso di mazzo/scarti nella pagina
    // (bug trovato controllando in un browser headless: l'arto arrivava a
    // una cella vera ma fuori dallo schermo, mai visibile). Si scrolla
    // verso ciascun bersaglio appena prima di raggiungerlo, non una volta
    // sola all'inizio.
    sourceEl.scrollIntoView({ behavior: "smooth", block: "center" });
    await sleep(ms(90));
    const sourcePoint = centerOf(sourceEl);
    figure.style.opacity = "1";
    placeFigureAt(sourcePoint);
    await sleep(ms(390));
    move.onArrive?.();

    applyPeekContent(move.peek, width);
    positionPeekNearFigureTop();
    peek.style.opacity = "1";
    await sleep(ms(420));

    const destEl = move.getDestinationEl();
    if (destEl) {
      destEl.scrollIntoView({ behavior: "smooth", block: "center" });
      await sleep(ms(90));
      const destPoint = centerOf(destEl);
      placeFigureAt(destPoint);
      positionPeekNearFigureTop();
      await sleep(ms(480));
      move.onSettle?.();
      await sleep(ms(220));
    } else {
      move.onSettle?.();
    }

    peek.style.opacity = "0";
    placeFigureAt(origin);
    figure.style.opacity = "0";
    await sleep(ms(480));
  }

  async function run(): Promise<void> {
    if (running) return;
    running = true;
    while (queue.length > 0) {
      const item = queue.shift()!;
      if (item.kind === "callback") {
        item.fn();
      } else {
        await playOne(item.move);
      }
    }
    running = false;
  }

  return {
    enqueue(move) {
      queue.push({ kind: "move", move });
      void run();
    },
    runAfterQueue(fn) {
      if (queue.length === 0 && !running) {
        fn();
        return;
      }
      queue.push({ kind: "callback", fn });
      void run();
    },
    destroy() {
      queue.length = 0;
      figure.remove();
      peek.remove();
    },
  };
}
