# Motto Jo — Specifiche v1

## Nota di ripresa lavori (aggiornata 2026-09-10, ultimissima: set di icone dell'app)

**Set di icone dell'app — creato e collegato.** Su richiesta ("crea tutto il
set di icone del gioco con la M verde e il piccolo Jo giallo fluo simile a
quello delle carte coperte"), generata una versione "da icona" dello stesso
logo del dorso delle carte (`assets/immagini/carte/carta_dorso.png`): stessa
M verde menta con contorno nero spesso e stesso "Jo" corsivo giallo fluo con
alone luminoso, ma ricomposta a piena tela quadrata (il dorso carta ha
proporzioni verticali da carta, non adatte a un'icona) così da restare
leggibile anche rimpicciolita a 16-32px. Sfondo pieno colore canonico
`#221f1c` (stesso di `--color-bg-app` in `src/styles.css`), nessuna scritta
extra, nessun watermark.

Generata con gpt-image-2 (ElevenLabs) usando il dorso carta come immagine di
riferimento; il modello ha ignorato la richiesta di tela quadrata e ha
prodotto un 16:9 — corretto in locale con PIL: ritaglio del solo logo
(mascherato per colore — verde/giallo/nero puro, NON semplice differenza dal
fondo, perché lo sfondo generato ha una leggerissima vignettatura che
altrimenti veniva scambiata per contorno nero) e ricomposizione centrata su
un nuovo canvas 1024×1024 a sfondo piatto, logo al 84% della dimensione
maggiore (margine sufficiente per le mascherine circolari/arrotondate di
iOS/Android). Verificato a occhio via lettura pixel (nessuna cucitura
visibile fra il ritaglio e il fondo piatto, colori confermati) dato che
l'utente non può guardare l'immagine lui stesso.

File creati in `assets/immagini/icone/`:
- `icona-master-1024.png` — master 1024×1024
- `favicon-32.png`, `favicon-192.png`, `favicon-512.png` (ridimensionati dal master)
- `apple-touch-icon-180.png`
- `favicon.ico` (multi-size 16/32/48, incorporato dal master 512px)

`index.html` ora linka tutti e quattro nel `<head>` (favicon.ico + due
varianti PNG + apple-touch-icon); non esisteva nessun link icona prima. Non
è stato creato un manifest PWA (non ce n'era già uno nel repo — fuori
scope di questa richiesta). `npm run typecheck` e `npm test` (192 test)
puliti dopo la modifica (solo file statici + markup, nessun codice
applicativo toccato).

## Nota di ripresa lavori (2026-09-10, rifiniture precedenti: musica vera, punti avversario, donazioni)

**"Somma punti" per un avversario — c'era già, solo non lo si sapeva.** Il
pulsante/scorciatoia esistente (`Alt+Maiusc+P`) legge sempre il Deck
attualmente "in ascolto" (`currentListenGrid()`/`currentListener()`), non
solo il proprio — quindi funziona già anche per un avversario, basta prima
passare alla sua vista (pulsante o `Alt+Maiusc+C`). Riverificato dopo tutti
i cambi di questa sessione e della precedente: `Alt+Maiusc+C` poi
`Alt+Maiusc+P` restituisce davvero "Punti dalle carte scoperte, Roberto:
totale X." Nessun codice nuovo necessario qui, solo la conferma.

**Musica di sottofondo — collegata per davvero (mancava, unico pezzo audio
rimasto scollegato).** Nuovo `src/ui/musicPlayer.ts` (stesso pattern di
`sfxPlayer.ts`/`narrationPlayer.ts`): un loop unico
(`assets/audio/musica/sottofondo.mp3`), avviato all'apertura della
schermata di gioco e fermato quando la si lascia (via il cleanup del
router). Volume di default portato da 100 a **10** in
`defaultAppSettings()` (richiesta esplicita) — a 0 la musica non parte
nemmeno (`sfxPlayer`/`musicPlayer` condividono la stessa convenzione: sotto
zero non c'è nemmeno un `new Audio()`). Cambiabile dal cursore "Musica di
sottofondo" già esistente in Extra, effetto dalla prossima apertura della
schermata di gioco (stessa convenzione già in uso per narrazione/effetti:
il volume si legge una volta all'avvio, le due schermate non sono mai
visibili insieme quindi non serve tenerlo sincronizzato in tempo reale).
Etichette dei cursori musica/effetti in Extra aggiornate (non dicono più
"non ancora collegati", ora è vero il contrario).

**Invito alla donazione in Extra — fatto.** In fondo alla schermata,
sotto le due tendine, testo fisso ("Ti è piaciuto questo audiogioco...")
più un pulsante "Dona con PayPal" — compare solo se il campo "Link per
donazioni PayPal" (già esistente, editabile) contiene qualcosa: punta
sempre e solo a quel valore, mai un URL inventato qui (l'assistente non
conosce e non deve indovinare il vero link PayPal dell'utente). Se il
campo è vuoto, un testo dice di compilarlo per far comparire il pulsante.
Icona nuova (`ICONS.dona`, un cuore semplice) — non un logo PayPal vero
(marchio registrato, non riprodotto): l'etichetta di testo "Dona con
PayPal" è quello che rende chiaro dove porta, come richiesto.

Tutto riverificato in un browser headless (CTA che compare/scompare col
campo, href corretto, slider musica a 10 di default, audio musica
davvero riprodotto al volume giusto, scorciatoie punti-avversario). `npm
run typecheck` e `npm test` (192 test, aggiornato il default atteso dei
volumi) puliti. Playwright installato solo per la verifica e disinstallato
subito dopo, come sempre.

---

**Cambio di rotta esplicito dell'utente**: la sezione 7 dello spec ("visibili
sempre: proprio Deck, mazzo, scarti") **non vale più**: ora vuole vedere e
poter navigare con VoiceOver anche il Deck di ciascun avversario. Aggiornare
la sezione 7 quando si rimette mano allo spec con calma.

**"Deck in ascolto" — ora anche visivo, non solo audio.** Riuso diretto del
meccanismo di ascolto già esistente (`listening`, punto 3 dello spec): nuova
sezione a schermo (`#listen-grid-section`, nascosta quando si ascolta il
proprio Deck — "Il tuo Deck" qui sopra è già quella vista) che mostra la
griglia di chi si sta ascoltando, stessa regola anti-imbroglio (`PublicGrid`,
mai il valore di una cella coperta), stesso pattern ARIA grid + roving
tabindex + frecce del proprio Deck — sola lettura: toccare una cella la legge
ad alta voce (esplorazione tattile) invece di agire (non si può giocare sul
Deck di qualcun altro). File coinvolti: `src/ui/screens/game.ts`
(`buildListenGrid`/`renderListenGridCells`/`renderListenGridSection`).

**Cambio automatico di vista durante il turno di un avversario (spec sezione
5, ora implementato per davvero)**: non appena la history registra una sua
mossa, la vista passa al suo Deck (suono "Cambio Deck" + narrazione "Ora
ascolti Deck di X", stesso meccanismo del pulsante manuale, fattorizzato in
`switchListening()`), POI parte l'animazione dell'arto — che ora viaggia
davvero fino alla cella vera che sta sostituendo (visibile nella sezione
appena mostrata), non più un ritiro a vuoto come nella sessione precedente
(quella scelta non serviva più, dato che ora la griglia avversaria è
visibile per davvero). A fine sequenza (o subito se non c'era nessuna
animazione in coda) si torna alla propria vista in silenzio e suona
"Passaggio di mano" (ha priorità sul "Cambio Deck", spec sezione 4).

**Due bug di sincronizzazione trovati SOLO controllando in un browser
headless** (nessuno dei due visibile leggendo il codice): il cambio di stato
del turno è sincrono, ma l'animazione dell'arto è asincrona (richiede tempo
vero per essere vista) — la vista non poteva quindi cambiare nello stesso
istante sincrono in cui cambia lo stato, andava sincronizzata con l'ANIMAZIONE:
1. Tornare alla propria vista veniva fatto subito quando arrivava l'evento
   "passaggio di mano" nella history — ma quell'evento è già presente nella
   history nello stesso istante sincrono della mossa dell'avversario che lo
   precede. Risultato: la vista tornava a sé stessa nello stesso istante in
   cui passava all'avversario, e il suo Deck non si vedeva **mai** davvero
   (0 millisecondi a schermo). Corretto aggiungendo `runAfterQueue()` a
   `LimbAnimator` (`src/ui/limbAnimation.ts`): accoda una funzione che parte
   solo dopo che tutte le animazioni accodate prima sono finite di
   riprodursi, invece di eseguirla subito.
2. Stesso identico bug nell'altro verso con più avversari di fila: passare
   alla vista del secondo avversario veniva fatto subito, prima ancora che
   l'animazione del primo iniziasse a riprodursi — il suo Deck spariva prima
   di essere mai stato visto. Risolto allo stesso modo: anche il cambio
   vista verso un avversario passa da `runAfterQueue()`, in coda insieme
   alla sua animazione, non più eseguito subito nel ciclo che legge la
   history.
3. **Terzo bug, di scroll**: la sezione "Deck in ascolto" può stare più in
   basso nella pagina di mazzo/scarti — lo scroll automatico verso
   `#table-area` (aggiunto nella sessione precedente) non bastava a portarla
   in vista quando l'arto doveva arrivarci. Risolto scrollando verso
   ciascun bersaglio (fonte, poi destinazione) appena prima di raggiungerlo,
   non una volta sola all'inizio della sequenza.
Tutti e tre trovati con lo stesso metodo: leggere `getBoundingClientRect()`
vero e `document.elementFromPoint()` a metà animazione in un browser
headless, non fidandosi della sola lettura del codice.

**Effetti sonori — finalmente collegati per davvero (punto 12, chiuso).**
Nuovo `src/ui/sfxPlayer.ts` (stesso pattern di `narrationPlayer.ts`, non in
coda seriale — sono stinger brevi, va bene si sovrappongano di rado).
Collegati tutti e 12:
- `pesca_mazzo`/`presa_scarti`: per l'umano al click del pulsante; per un
  avversario sincronizzati con l'arto (`onArrive`, quando tocca la fonte).
- `scarto`: per l'umano subito quando la sua mossa entra in history; per un
  avversario sincronizzato con l'arto (`onSettle`, quando la carta arriva a
  destinazione) — evita di sentirlo due volte.
- `cambio_deck`/`passaggio_mano`: dentro `switchListening()`, vedi sopra.
- `colonna_fanfara` (prima di "Motto Gioooo!") e `ultimo_turno`: sugli
  eventi `column-cleared`/`round-closed` della history.
- `vittoria_manche`/`vittoria_partita`/`sconfitta`: dal punto di vista
  dell'umano (`playRoundOutcomeSfx`) — punteggio di manche più basso (anche
  a pari merito) = vittoria manche, altrimenti sconfitta; se la partita
  finisce con quella manche il suono di fine partita prende il posto di
  quello di manche.
- `mescolio`+`disposizione`: una volta per manche, mai su una partita
  ripresa alla manche in cui era rimasta (`sfxPlayedForRound`).

**Carta pescata dal mazzo — ora visibile e narrata in automatico.** Quando
si pesca (`decide-deck-card`), oltre al testo già esistente ora c'è anche
una vera carta a schermo (stile identico alle altre, fascia di colore
inclusa, `aria-hidden` perché l'informazione vera resta nel messaggio di
stato) e — **unica eccezione aggiunta alla regola "il turno umano non si
narra mai"** — la voce dice subito quale carta è. Serviva un frammento
vocale nuovo, mai registrato finora: generato con ElevenLabs **con la
stessa identica voce del progetto** (`voice_id QZ4YsXHfl8zZccXKHAFZ`,
"Presentatore", `eleven_multilingual_v2`, una sola generazione come da
convenzione) — "Hai pescato,", salvato in
`assets/audio/frammenti/connettivi/hai_pescato.mp3`, aggiunto a
`PHRASES` (`src/narration/fragments.ts`) e documentato in
`motto-jo-frasi-narrazione.md` come tutti gli altri.

**Sulle due preoccupazioni per VoiceOver che l'utente ha sollevato**:
- *"Come faccio a sapere riga/colonna mentre scelgo dove piazzare la
  carta?"* — già risolto in una sessione precedente e confermato ora
  ancora funzionante: ogni cella (proprio Deck e ora anche Deck in
  ascolto) ha un'etichetta ARIA che dice sempre "Riga X colonna Y: valore
  o coperta", indipendentemente da come ci si arriva (swipe, frecce da
  tastiera, tocco diretto) — VoiceOver la legge a ogni cella toccata,
  prima ancora del valore.
- *"Se scarto subito devo comunque scoprire una carta coperta mia, giusto?"*
  — sì, corretto, ed è già impedito di sbagliare: nello stato
  `placing-discard-reveal` cliccare una cella già scoperta non fa nulla e
  dice "Questa carta è già scoperta: scegli una carta ancora coperta."
  invece di accettarla per errore.

Non toccato in questo giro: `colonna_fanfara`/`ultimo_turno` restano
sincroni col cambio di stato (non messi in coda con l'animazione come i
tre punti sopra) — evento raro abbastanza da non aver richiesto lo stesso
trattamento per ora, possibile rifinitura futura se si nota un problema
analogo.

**Bug non riprodotto**: durante l'autoverifica è comparso una volta un
`TypeError: Cannot read properties of undefined (reading '0')` in console,
non più ripresentatosi in circa 15 tentativi successivi mirati (incluse
più manche intere, chiusura partita, scarti ripetuti). Tenuto d'occhio,
non bloccante, ma segnalato qui per trasparenza nel caso si ripresenti.

`npm run typecheck` e `npm test` (192 test) puliti. Playwright installato
solo temporaneamente per tutte queste verifiche e disinstallato subito
dopo, come da convenzione.

---

**Braccia/zampe integrate per davvero (punto 11) — chroma-key fatto.** Le 9
immagini in `Immagini da testare/corrette/` sono state passate per
`scripts/chroma-key.mjs` e salvate in `assets/immagini/braccia/`:
- Ogni immagine ha un colore di sfondo magenta leggermente diverso (misurato
  pixel per pixel, non tutte esattamente `#FF00FF`) — passato come `--color`
  specifico per ciascuna invece della tolleranza di default, altrimenti
  alcune sarebbero rimaste parzialmente opache.
- **Bug trovato e corretto da solo**: il taglio produceva un sottile alone
  magenta lungo il contorno (spill dell'antialiasing originale contro lo
  sfondo). Una prima correzione per "decontaminazione colore" ha peggiorato
  le cose; risolto invece erodendo il canale alpha di ~2-3px e sfumandolo di
  nuovo (tecnica standard da compositing) — alone ridotto a tracce
  impercettibili alla dimensione reale di visualizzazione (verificato
  componendo ogni immagine sullo sfondo scuro vero dell'app e leggendo i
  pixel, non fidandomi dell'anteprima: l'anteprima di alcuni PNG con
  trasparenza in questa sessione non è affidabile, mostra magenta piena
  anche quando il canale alpha è corretto — verificato più volte comparando
  con una composizione fatta a mano).
- Tutte e 9 ritagliate al bounding box reale del contenuto (rimosso il
  margine trasparente in eccesso): prima aurora/roger/marco (mai ruotate)
  avevano un canvas 1408×768 con l'arto occupante solo una fascia centrale,
  contro le altre sei 768×1408 quasi piene — proporzioni molto diverse che
  avrebbero reso incoerente qualunque dimensionamento a schermo. Ora tutte
  hanno un rapporto larghezza/altezza simile (~0.38-0.61), pronte per un
  contenitore CSS con `aspect-ratio` condiviso.

**Animazione del braccio/zampa durante il turno IA (spec sezione 5) — prima
versione funzionante.** Nuovi file: `src/ui/limbAnimation.ts` (motore
puro-DOM dell'animazione, non testato con vitest — stessa convenzione di
`narrationPlayer.ts`, verificato con screenshot/misure in un browser
headless), `src/ui/limbAssets.ts` (mappa id avversario → immagine).

- Sequenza per ogni mossa di un avversario (evento `type: "move"` in
  `match.round.history`, saltati gli umani): compare dal bordo inferiore
  **del viewport** (non della pagina — vedi sotto perché), va al mazzo o
  agli scarti (a seconda di `event.source`), si ferma mostrando una
  piccola carta che si intravede parzialmente dietro/sotto la mano (coperta
  in stile dorso se presa dal mazzo, a faccia in su con la fascia di
  colore giusta se presa dagli scarti — dato già noto in quel caso), poi:
  - Azione `"discard"` (pesca dal mazzo e scarta subito): prosegue fisicamente fino
    agli scarti, la pila si aggiorna e lampeggia, poi si ritira e scompare.
  - Azione `"replace"` (sostituzione in griglia, da mazzo o scarti): si
    ritira direttamente verso il basso senza una seconda destinazione
    visibile, e la pila scarti lampeggia lo stesso (mostra la carta appena
    tolta dalla griglia dell'avversario) — **scelta deliberata**: la
    griglia degli avversari non è mai mostrata a schermo (spec sezione 7,
    confermato), quindi far "toccare" all'arto un punto che assomigli a una
    griglia avrebbe potuto far credere che stesse interagendo con quella
    dell'utente umano, l'unica visibile. Se in futuro si decide di mostrare
    le griglie avversarie, questo è il punto da rivedere.
  - Dimensione dell'arto legata davvero alla carta a schermo (richiesta
    esplicita dell'utente): larghezza = 1.1× la larghezza reale di una
    cella della propria griglia in quel momento (letta dal DOM, non un
    valore fisso), altezza proporzionale con `aspect-ratio` CSS fissa.
- **Tre bug trovati e corretti durante l'autoverifica** (nessuno visibile
  solo leggendo il codice, tutti emersi controllando in un browser
  headless):
  1. Ancorando l'arto per il centro dell'immagine (invece che vicino alla
     mano, in cima), la metà inferiore finiva regolarmente sopra "Il tuo
     Deck" e le celle della griglia sottostanti. Corretto ancorando vicino
     alla cima (dove sta la mano/zampa in tutte le immagini, per via
     dell'orientamento sistemato in una sessione precedente) e riducendo la
     dimensione (da un primo tentativo 2.3×, poi 1.7×, infine 1.1× la
     larghezza carta) finché lo spazio verticale disponibile tra le pile e
     l'intestazione sottostante è bastato a contenerlo senza sovrapporsi.
  2. L'elemento dell'arto viveva dentro un contenitore posizionato nella
     pagina normale: se nel frattempo il focus da tastiera spostava lo
     scroll (es. verso il messaggio "scegli una cella"), l'animazione
     restava fuori dalla parte visibile di pagina, invisibile a chi guarda.
     Risolto in due parti: l'arto è ora `position: fixed` rispetto al
     viewport (non alla pagina — combacia anche meglio con "bordo
     inferiore dello schermo" della richiesta originale), e quando una
     nuova animazione sta per partire la pagina fa uno scroll automatico
     dolce per riportare in vista mazzo/scarti — tocca solo lo scroll
     visivo, mai il focus reale, quindi non ha alcun effetto per chi usa
     VoiceOver.
  3. Bug più subdolo: il riferimento al pulsante mazzo/scarti veniva letto
     una volta sola all'inizio dell'animazione e riusato dopo una pausa
     (`await`) — ma `renderTableArea()` ricrea quei pulsanti con
     `innerHTML` a ogni cambio di stato, quindi il riferimento poteva
     restare quello di un nodo ormai staccato dal DOM (che
     `getBoundingClientRect()` misura come tutto zero, mandando l'arto e
     la carta "intravista" a comparire nell'angolo in alto a sinistra dello
     schermo). Corretto rileggendo sempre il pulsante vero appena prima di
     misurarne la posizione, mai prima di un'attesa.
- `src/ui/router.ts`: `RouteRenderer` può ora restituire una funzione di
  pulizia (richiamata dal router a ogni cambio schermata) — serviva per
  rimuovere gli elementi dell'animazione dal DOM quando si lascia la
  schermata di gioco, altrimenti sarebbero rimasti lì per sempre.
- Non incluso in questa passata: righe/colonne di lettura non hanno
  un'animazione dedicata (non la richiedono, sono solo ascolto); l'evento
  di scoperta iniziale (`initial-reveal`) non anima l'arto, dato che non
  coinvolge mazzo/scarti.

`npm run typecheck` e `npm test` (192 test) puliti dopo tutte le modifiche.
Playwright installato solo temporaneamente per la verifica (più cicli, dato
quanti bug ha fatto emergere) e disinstallato subito dopo, come da
convenzione già in uso.

---

**Prima proposta di disposizione/interfaccia per la schermata di gioco (punto 8)** — fatta, funzionante, non ancora rivista dall'utente (ha chiesto una prima proposta sua da modificare dopo). Riscritti `src/ui/screens/game.ts` e `src/styles.css`, più due file nuovi:

- `src/ui/icons.ts`: piccola libreria di icone SVG inline decorative (`aria-hidden`, mai l'unica informazione — ogni pulsante ha sempre anche testo visibile vero).
- `src/ui/valueBand.ts` (+ `tests/ui/valueBand.test.ts`): logica pura, mappa un valore carta (-2..12) alla fascia di colore giusta (spec sezione 5).
- `src/ui/router.ts`: aggiunto supporto cleanup (`RouteRenderer` può ora restituire una funzione di pulizia, richiamata dal router a ogni cambio schermata) — necessario per rimuovere lo scorciatoie da tastiera globali quando si lascia la schermata di gioco, altrimenti sarebbero rimaste attive ovunque.

**Decisioni di disposizione**:
- Mazzo coperto e cima degli scarti sono **contemporaneamente l'oggetto visivo e il pulsante d'azione**: chi vede tocca il mucchio di carte per pescarlo/prenderlo, chi ascolta sente un'unica etichetta con la stessa azione ("Pesca dal mazzo coperto, 12 carte rimaste" / "Prendi dagli scarti, in cima: dieci") — nessun testo/pulsante duplicato altrove. Disabilitati (con `disabled` vero, non solo visivo) quando non è il momento di pescare (scoperta iniziale, già pescato, partita finita).
- Le 12 celle del proprio Deck sono uno `role="grid"` con `role="row"`/`role="gridcell"` e **roving tabindex + navigazione a frecce** (una sola cella raggiungibile con Tab, le frecce spostano il focus dentro la griglia) — pensato apposta per chi usa una tastiera Bluetooth esterna, oltre allo swipe di VoiceOver che già funzionava.
- Celle coperte: sfondo con l'illustrazione vera del dorso (`carta_dorso.png`, la mascotte M+Jo), non un segnaposto. Celle scoperte: pastiglia crema (`#F1E9D8`) con cifra carbone e **bordo colorato secondo la fascia di valore vera** (blu ardesia -2/-1, crema 0, verde 1-4, oro 5-8, bordeaux 9-12) — stessa codifica della spec, applicata per la prima volta nell'interfaccia vera (prima non esisteva ancora nel codice).
- Pulsanti azione (Tieni/Scarta la carta pescata, Cambia Deck in ascolto, Leggi tutto il Deck, Somma punti, Leggi riga/colonna) hanno tutti **icona SVG decorativa + etichetta di testo vera e visibile** (mai icona da sola) — le icone sono forme semplici intuitive (es. due frecce circolari per "cambia ascolto", una griglia di puntini 3×4 per "leggi tutto il Deck").
- **Scorciatoie da tastiera per chi usa una tastiera Bluetooth**: sempre `Alt+Maiusc+<lettera>`, mai lettera nuda — scelta deliberata: le lettere nude sono già riservate dalla navigazione rapida di VoiceOver su Mac (saltano tra elementi per tipo), quindi userebbero conflitto; `Alt+Maiusc+` è la combinazione raccomandata dalle ARIA Authoring Practices proprio per evitare questo. Mappa: `M` pesca dal mazzo, `S` prendi dagli scarti, `T` tieni la carta pescata, `X` scartala, `C` cambia Deck in ascolto, `L` leggi tutto il Deck, `P` somma punti, `H` torna alla schermata iniziale. Il suggerimento della scorciatoia compare anche visivamente accanto al pulsante (tag `<kbd>`), ma è `aria-hidden` così non si mescola con l'etichetta vera per chi ascolta — verificato che il nome accessibile calcolato resta pulito ("Tieni questa carta", non "Tieni questa cartaAlt+Maiusc+T").
- Righe/colonne singole (7 pulsanti) non hanno scorciatoia dedicata per ora (troppe per il set di lettere disponibili) — restano raggiungibili con Tab/frecce, si può aggiungere in seguito se richiesto.

**Autoverifica fatta** (io non posso vedere lo schermo, quindi ho controllato con un browser headless invece di fidarmi a occhio):
- Screenshot (Playwright, viewport tipo smartphone) per il controllo visivo mio.
- **Bug trovato e corretto da solo**: la regola CSS che attenuava i pulsanti disabilitati (`opacity: 0.5` su tutto il pulsante) rendeva illeggibile il colore di fascia sulla cima degli scarti quando disabilitata (il crema diventava un grigio-marrone sporco, controllato leggendo i pixel dello screenshot, non solo lo stile dichiarato). Corretto: ora si attenua solo l'etichetta di testo sotto, la carta resta sempre a piena intensità di colore.
- Controllo `role`/`aria-label`/`tabindex` via DOM su tutte le 12 celle: corretti.
- Controllo del nome accessibile vero (non solo il testo grezzo) dei pulsanti con scorciatoia: confermato che il tag `<kbd>` `aria-hidden` non si infiltra nel nome letto da uno screen reader.
- Simulata una manche intera fino allo scambio di turno con l'IA (Roberto): la narrazione testuale/log ha funzionato come da spec dopo il refactor, nessun errore in console.
- `npm run typecheck` e `npm test` (192 test, +5 per `valueBand`) puliti.
- Playwright installato solo temporaneamente per la verifica e disinstallato subito dopo (stessa convenzione già in uso nelle sessioni precedenti — non è una dipendenza permanente del progetto).

**Cosa NON è ancora in questa proposta** (fuori dall'ambito di oggi, o già rimandato in spec):
- Nessuna griglia visiva per gli avversari — corretto così, la spec (sezione 7) chiede visibili sempre solo il proprio Deck, mazzo e scarti; gli avversari restano raggiungibili solo via "Cambia Deck in ascolto", non serve un secondo riquadro a schermo.
- Braccio/zampa dell'avversario che scorre dal basso durante il turno IA (spec sezione 5) — non incluso in questo giro, resta un punto aperto.
- Le celle della griglia restano cliccabili (ma senza effetto, comportamento preesistente) anche nella fase in cui si è già pescato e si deve solo scegliere Tieni/Scarta — non un regressione introdotta oggi, ma un margine di miglioramento possibile (disabilitarle in quella fase specifica).
- Nessun colore per pulsanti/pannelli oltre a quanto già usato (superfici grigio-carbone leggermente più chiare dello sfondo, focus giallo fluo): il resto della palette dei pulsanti resta da affinare quando l'utente rivede la proposta.

---

**Obiettivo con scadenza**: l'utente vuole la v1 presentabile entro la sera del
2026-09-10 (sorpresa per persone a cui tiene). Ha chiesto all'assistente di
guidare il completamento in autonomia, essendo cieco e senza un revisore
sighted affidabile sempre disponibile — per gli asset visivi l'assistente si
autoverifica leggendo le immagini pixel per pixel (Read tool) invece di
aspettare un riscontro umano; per l'audio l'utente giudica da sé ad
orecchio.

**Fatto in questa sessione**:

- **Immagini carte/braccia (punto 11) — corrette, non ancora integrate.**
  L'utente aveva generato con Gemini le 15 carte, le 7 braccia, la zampa di
  Roger e la gamba di Marco in `Immagini da testare/` (prefissi `carta_`,
  `braccio_`, `zampa_`, `gamba_`). Due problemi rilevati e risolti dei
  cinque, salvati in `Immagini da testare/corrette/` (stesso nome file,
  originali intatti):
  - Watermark Gemini (piccola scintilla in basso a destra, presente su
    **tutte** le 24 immagini comprese le carte, solo più mimetizzato lì per
    via del colore crema) — rimosso via "timbro clone" (per le carte:
    porzione speculare dell'angolo opposto della stessa carta; per le
    braccia: porzione pulita dello stesso sfondo magenta) con bordi
    sfumati. Verificato a occhio (mio) su tutte le immagini, nessuna
    cucitura visibile.
  - Orientamento braccia: solo Aurora, Roger e Marco erano già generati
    dal basso verso l'alto come da spec. Le altre sei braccia (Alessandro,
    Elena, Graziano, Lorenzo, Martina, Roberto) erano orizzontali (da
    destra) — ruotate 90° orarie dopo la pulizia del watermark (non prima,
    per evitare che il watermark ruotato finisse sopra il tessuto della
    manica invece che sullo sfondo). Le braccia ruotate ora hanno
    dimensioni file 768×1408 invece di 1408×768 come Aurora/Roger/Marco —
    da tenere presente in CSS quando si integrano (intrinsic size diversa,
    ma aspect ratio verticale coerente).
  - **Ancora da fare su questo punto**: le immagini corrette sono ferme in
    `Immagini da testare/corrette/`, non ancora spostate/rinominate in
    `assets/immagini/carte/` e `assets/immagini/braccia/`; le braccia non
    sono ancora passate per `scripts/chroma-key.mjs` (nota: gli sfondi
    magenta non sono un `#FF00FF` puro identico su tutte — es. Alessandro
    aveva un magenta più "spento" — quindi la tolleranza di default (40)
    dello script potrebbe non bastare per tutte, testare prima di lanciare
    in blocco); dorso carta non ancora generato (vedi sotto); nessuna delle
    due categorie è ancora referenziata nel codice/UI.

- **Decisioni di tema visivo prese in sessione** (necessarie per generare
  correttamente copertina/dorso, non ancora applicate al CSS):
  - Sfondo generale dell'app (tavolo di gioco e schermata iniziale): **nero
    / carbone scurissimo**, non nero puro — scelto al posto del verde
    tavolo da casinò perché il verde si confonderebbe con la cornice verde
    panno già usata dalle carte 1-4, riducendo il contrasto per chi ha un
    residuo visivo. Bordeaux scurissimo era l'alternativa scartata.
  - Dorso carta: stesso mascotte della copertina (M verde menta maiuscola,
    contorno nero, "Jo" corsivo giallo fluo), su sfondo scuro coerente col
    nuovo tema app-wide — **non ancora generato**.
  - **Copertina e dorso — fatti.** Rigenerati entrambi (gpt-image-2, 4
    varianti ciascuno, scelti dopo autoispezione pixel per pixel) con lo
    sfondo scuro app-wide già incluso nei pixel (niente più trasparenza
    inseguita): stessa mascotte M verde menta + "Jo" corsivo giallo fluo,
    stile flat design pulito. Copertina salvata come
    `assets/immagini/copertina-motto-jo.png` (ex `.jpg` rotto con la
    scacchiera rimosso), 1280×720, collegata davvero in `src/ui/screens/home.ts`
    (era un `<div>` segnaposto, ora un `<img>` con alt descrittivo).
    Dorso salvato come `assets/immagini/carte/carta_dorso.png`, ritagliato
    e portato a 864×1216 (stesso rapporto 5:7 e stessa risoluzione delle 15
    facce numerate) — **non ancora collegato al codice** (la griglia di
    gioco non mostra ancora immagini carte, vedi sotto). Nota tecnica: il
    tool di generazione immagini ignora le richieste di aspect ratio nel
    prompt (torna sempre 16:9, 1280×720) — il ritaglio all'aspect ratio
    giusto va sempre fatto dopo, a mano con PIL, verificando che il
    contenuto non venga tagliato.
  - `npm run typecheck` e `npm test` (187 test) puliti dopo le modifiche a
    `home.ts` ed `extra.ts` di questa sessione.
  - **Aggiornamento — colore di sfondo reso definitivo ed esatto.** L'utente
    ha chiesto conferma che copertina e dorso non sparissero contro lo
    sfondo nero del gioco. Controllo di persona (lettura pixel): il "nero"
    generato nei due file non era uguale tra loro (`#070707` la copertina,
    `#111111` il dorso — entrambi vicinissimi al nero ma diversi tra loro
    di una quantità misurabile) **e nessuno sfondo pagina esisteva ancora
    nel codice** (zero CSS nel progetto finora: l'app avrebbe mostrato le
    immagini come un riquadro scuro su pagina bianca di default del
    browser, non su nero). Corretto tutto in una volta:
    - Fissato un colore unico definitivo, `#221F1C` (stesso "carbone
      quasi-nero" già usato in spec per la cifra delle carte, "mai nero
      puro") — riutilizzato apposta invece di inventarne uno nuovo.
    - Sfondo di entrambe le immagini riallineato esattamente a `#221F1C`
      con uno shift di colore uniforme (differenza minima, pochi punti su
      255, impercettibile sul verde/giallo della mascotte — verificato a
      occhio prima e dopo).
    - Creato `src/styles.css` (collegato in `index.html`): imposta
      `--color-bg-app: #221F1C` su `html`/`body` (più
      `--color-text-app: #F1E9D8`, lo stesso avorio/crema già nella
      palette valori carte, come colore testo minimo leggibile — nessun
      altro stile deciso, resto del tema ancora aperto). Ora sfondo pagina
      e sfondo delle due immagini combaciano esattamente, zero rischio di
      bordo visibile.
    - Verde mascotte misurato ~`#83D392`, giallo "Jo" ~`#DFD71E`: contrasto
      enorme contro `#221F1C` in entrambi i casi, la mascotte resta
      leggibilissima indipendentemente da qualunque tono scuro si fosse
      scelto — il problema reale era solo il bordo tra sfondo-immagine e
      sfondo-pagina, non la mascotte stessa.
    - `npm run typecheck` pulito dopo l'aggiunta del CSS.

- **Audio — musica ed effetti sonori generati, non ancora scelti né
  collegati al codice.** Decisioni prese con l'utente: un solo loop di
  sottofondo per la v1 (non più le "fino a tre tracce" della spec
  originale — semplificazione concordata), carattere "cartoon/arcade
  giocoso" per gli effetti, suoni delle carte "plastificati/premium".
  Generato con ElevenLabs (flow `44VJkPaXQlSHmhYB92JR`,
  https://elevenlabs.io/app/flows/44VJkPaXQlSHmhYB92JR):
  - **12 effetti fissi della sezione 4, 4 varianti ciascuno** (48 file),
    scaricati in `assets/audio/effetti/<nome>/v1.mp3`..`v4.mp3`: `mescolio`,
    `disposizione`, `pesca_mazzo`, `presa_scarti`, `scarto`,
    `colonna_fanfara`, `ultimo_turno`, `vittoria_manche`,
    `vittoria_partita`, `sconfitta`, `cambio_deck`, `passaggio_mano`.
    **L'utente deve ascoltarli e scegliere una versione per ciascuno** —
    nessuna scelta ancora fatta.
  - **2 candidate per la musica di sottofondo, 4 varianti ciascuna** (8
    file), scaricate in `assets/audio/musica/candidata_elettropop/` e
    `assets/audio/musica/candidata_orchestrale/` (v1..v4, ~180s ciascuna,
    pensate per girare in loop). Verificato via trascrizione
    (`eleven_scribe_v1`) che sono strumentali, nessun testo cantato
    rilevato. **L'utente deve scegliere lo stile (o chiedere un
    terzo giro) e la variante finale.**
  - Costo totale sessione ElevenLabs: circa 3 USD (effetti pochi centesimi
    l'uno, musica ~0.16 USD a variante).
  - **Aggiornamento — scelte dell'utente applicate.** Musica: scelta
    `candidata_orchestrale/v1`, copiata come file definitivo
    `assets/audio/musica/sottofondo.mp3`. Effetti: l'utente ha ascoltato,
    tagliato la coda di silenzio finale e rinominato di suo pugno 11 dei 12
    suoni come `<nome> definitivo.mp3` dentro `assets/audio/effetti/`; questi
    sono stati rinominati in forma pulita snake_case in
    `assets/audio/effetti/<nome>.mp3` (`cambio_deck`, `colonna_fanfara`,
    `mescolio`, `passaggio_mano`, `pesca_mazzo`, `presa_scarti`, `scarto`,
    `sconfitta`, `ultimo_turno`, `vittoria_manche`, `vittoria_partita`) — sono
    questi gli 11 file da collegare nel codice, non i sottocartelle `vN`
    (rimosse, ormai vuote). Tutte le varianti scartate (musica e effetti,
    comprese le 4 vecchie di `disposizione`) sono state spostate **fuori dal
    progetto**, rinominate per suono, in due cartelle esterne che l'utente
    riusa anche per altri progetti (stesso schema già in uso in
    `/Users/robertolachin/Programmazione/suoni per app/` per Motto Chess:
    nome-suono_vN.mp3):
    - `/Users/robertolachin/Programmazione/Effetti vari/` (effetti)
    - `/Users/robertolachin/Programmazione/Musica varie/` (musica)
  - **`disposizione` rigenerato**: l'unico suono scartato in blocco.
    Motivo indicato dall'utente: rappresentava una sola carta appoggiata,
    ma la disposizione iniziale mette 12 carte sul tavolo — serve un suono
    con 3-4 carte in rapida successione, non un colpo singolo. Rigenerate 4
    nuove varianti con questo criterio (stesso flow ElevenLabs
    `44VJkPaXQlSHmhYB92JR`), in `assets/audio/effetti/disposizione/v1..v4.mp3`
    — **l'utente deve ancora ascoltarle e scegliere**, poi si ripete lo
    stesso trattamento (rinomina pulita + resto spostato in "Effetti vari").
  - **Resta da fare**: scrivere il codice di riproduzione vera per musica ed
    effetti (oggi solo la voce narrante è collegata — vedi punto 4 più
    sotto, chiuso solo per la narrazione).

- **Contenuto per la schermata Extra — testo "perché ho creato questo
  gioco" — fatto.** Storia personale (crociera Motto on Tour, Martina e
  Lorenzo, motivazione accessibilità) aggiunta in `src/ui/screens/extra.ts`
  come tendina nativa (`<details>/<summary>`, "Perché ho creato questo
  gioco"), separata dal campo "Breve biografia" editabile (quello resta
  per bio/contatti liberi dell'installazione, questo è testo fisso
  dell'autore). Emoji nel testo avvolte in `<span aria-hidden="true">` così
  VoiceOver legge il testo pulito senza nomi di emoji intercalati, restando
  visibili a chi guarda lo schermo — scelta confermata dall'utente. Sulla
  posizione (tendina in Extra vs. schermata dedicata vs. dentro il campo
  bio) l'utente non ha risposto alla domanda specifica: ho applicato di
  default l'opzione consigliata (tendina dentro Extra) — **da confermare
  o cambiare alla prossima occasione**.

  Aggiunta una **seconda tendina** ("Chi sono"), stesso trattamento emoji,
  con la presentazione dell'utente (judoka e podcaster non vedente, Motto
  Podcast con Elena Travaini) e i contatti: link a `mottopodcast.org`
  (`<a href="https://mottopodcast.org">`) e email `mottopod@gmail.com`
  (`<a href="mailto:mottopod@gmail.com">`), entrambi link veri e cliccabili,
  non solo testo. `npm run typecheck` e `npm test` puliti dopo entrambe le
  modifiche.

**Prossimi passi proposti** (in ordine): 1) attendere le scelte audio
dell'utente e generare copertina/dorso sul nuovo sfondo scuro (autoverifica
visiva mia); 2) chroma-key + spostamento definitivo di carte/braccia in
`assets/immagini/`; 3) integrazione di immagini e audio scelto nel codice
(CSS/UI + riproduzione musica/effetti); 4) collaudo di una partita intera
punto 13 dell'ordine dei lavori.

---

## Nota di ripresa lavori precedente (2026-09-09, sessione principale)

Sviluppo in corso con Claude Code, cartella `/Users/robertolachin/Programmazione/Motto Jo`.

**Fatto e testato** (`npm test` — 137 test verdi, `npm run typecheck` pulito):
- Punto 1 — motore di gioco puro (`src/engine/`)
- Punto 2 — gestore di stato e turni (`src/state/`)
- Punto 3 — profili di intelligenza dei nove avversari (`src/ai/`)
- Punto 4 — motore narrativo testuale (`src/narration/`): generazione delle
  frasi fatta e testata, per tutti gli eventi e in entrambe le varianti di
  verbosità. Testo di riferimento completo (frammenti + frasi fisse) in
  `motto-jo-frasi-narrazione.md`, richiamato dalla sezione 3 qui sotto.
- Punto 5 — comandi di esplorazione (`src/exploration/`): lettura di una
  posizione/riga/colonna/Deck intero, cambio Deck in ascolto, somma punti.
  Regola anti-imbroglio garantita dal tipo `PublicGrid` (una carta coperta
  non porta con sé alcun valore, non solo per convenzione ma proprio a
  livello di tipo).

**Ancora aperto nel punto 4** (lasciato da parte per ora, su richiesta): manca
solo l'ultima frase della voce ("Collegamento alla sintesi vocale di sistema")
— cioè far suonare davvero i frammenti audio in sequenza. Rimandato di
proposito: non ha senso costruirlo prima di avere i file audio veri (voce
scelta su ElevenLabs + frammenti generati secondo l'elenco in
`motto-jo-frasi-narrazione.md`). Probabilmente andrà fatto insieme al punto 8
(schermata di gioco), quando ci sarà un loop di turno reale a cui agganciarlo.

**Generazione audio frammenti — in corso.** Voce scelta su ElevenLabs:
"Presentatore" (`voice_id` `QZ4YsXHfl8zZccXKHAFZ`, voce maschile italiana),
modello `eleven_multilingual_v2`, una sola generazione per frammento (niente
varianti, per non sprecare crediti). Convenzione di lettura: ogni frammento
recitato da solo con una virgola finale per una pausa naturale
nell'incollaggio ("due,", "Marco,"); i valori negativi si scrivono "meno"
("meno due"); niente tag tra parentesi quadre (tipo `[cheerful]`) perché
altererebbero il tono solo su alcuni frammenti, creando stacchi percepibili
quando il motore li incolla ad altri neutri — stessa lettura piatta per
tutti i frammenti. "Roger" (uno dei nove nomi) va letto alla lettera in
italiano, non all'inglese (scelta esplicita dell'utente).

Fatto finora:
- Sezione 1.1 (numeri valori carta, -2..12): tutti e 15 generati e salvati in
  `assets/audio/frammenti/numeri/` (`num_meno_due.mp3` ... `num_dodici.mp3`,
  nomi file = chiave codice della tabella). `num_otto.mp3` è stato
  rigenerato (leggeva male "otto" nella prima versione): testate due
  varianti di prova ("otto," con virgola finale, come da convenzione, e
  "otto" senza), l'utente ha scelto la versione con virgola dopo averle
  ascoltate entrambe — file sostituito, cartella di prova
  `assets/audio/test_otto/` rimossa.
- Sezione 1.2 (nomi dei nove avversari): tutti e 9 generati e salvati in
  `assets/audio/frammenti/nomi/` (`nome_roberto.mp3`, `nome_elena.mp3`,
  `nome_lorenzo.mp3`, `nome_martina.mp3`, `nome_graziano.mp3`,
  `nome_marco.mp3`, `nome_roger.mp3`, `nome_alessandro.mp3`,
  `nome_aurora.mp3`).
- Sezione 1.3 (connettivi): tutti e 29 generati e salvati in
  `assets/audio/frammenti/connettivi/` (nomi file = chiave codice della
  tabella). Convenzione di lettura decisa frase per frase sugli esempi della
  sezione 3 (non una virgola uniforme come per numeri/nomi): i connettivi che
  si incollano senza pausa al frammento successivo sono stati registrati
  senza virgola finale (es. `az_scarta` "scarta un", `fonte_scarti` "prende
  dagli scarti", `pos_riga` "riga", `pos_colonna` "colonna", `az_sostituisce`
  "sostituisce", `ess_scambia` "scambia", `ess_e_scopre` "e scopre",
  `esito_scopre` "Scopre", `ess_con_un` "con un", `esito_ora_e_un` "ora è
  un", `esito_li_cera_un` "Lì c'era un", `art_un` "un", `colonna_completa`
  "completa la colonna", `colonna_completa_tu` "Completi la colonna",
  `totale` "totale", `deck_di` "Deck di", `ora_ascolti` "Ora ascolti"),
  mentre quelli che sono veri punti di pausa hanno la virgola finale (es.
  `fonte_mazzo` "pesca dal mazzo,", `esito_era_coperta` "era coperta,",
  `coperta` "coperta,"). `il_tuo_deck` è stato registrato con punto finale
  ("il tuo Deck.") perché nell'unico contesto in cui è usato (3.7) è sempre
  l'ultima parola della frase. Gli altri (già con punteggiatura fissa nella
  tabella: `esito_era_coperta_ora_scartata`, `esito_ora_scartato`,
  `colonna_annullata`, `chiusura_scopre_ultima`,
  `chiusura_scopri_ultima_tu`, `punti_altrui`, `punti_propri`) sono stati
  registrati esattamente come scritti in tabella. Flow ElevenLabs di
  riferimento: "Motto Jo - Connettivi"
  (`https://elevenlabs.io/app/flows/Pmzm4prI9apbNgPMVNNL`).

Fatto: Sezione 1.4 (numeri generici per i punteggi) — 209/209 frammenti
generati e scaricati con successo, zero fallimenti. Numeri interi registrati
per intero (mai composti a livello di sillaba) da -20 a 200 compreso (221
valori, di cui 15 riusati dai frammenti -2..12 della sezione 1.1, senza
rigenerarli — quindi 206 nuovi), più tre parole "centinaio"
(`num_trecento`, `num_quattrocento`, `num_cinquecento`; `num_duecento` è
incluso nei 206 del blocco -20..200). Oltre 200, per i punteggi 201-599
(caso limite: la soglia di fine partita è 100 ma il raddoppio di manche può
in teoria portare oltre — vedi nota più sotto) si userà a runtime un
collage: la parola "centinaio" dedicata incollata al numero 0-99 già
registrato (es. "duecento," + "ventitré," per 223) — rischio di piccola
cucitura percepibile accettato consapevolmente, proprio perché è un caso
limite improbabile in partita reale; per questo si è scelto di tenere piena
qualità (registrazione intera) fino a 200, l'intervallo che si sentirà
quasi sempre. Parole esatte prese dalla funzione reale `numberToWords` di
`src/narration/numbers.ts` (non trascritte a mano). Tutti i 224 file totali
(15 + 209) in `assets/audio/frammenti/numeri/num_<parola>.mp3`. Il
meccanismo di collage a runtime per 201-599 resta da implementare nel
codice (non ancora fatto, solo l'audio dei pezzi è pronto).
- Sezione 2 (frasi fisse intere): `motto_jo` fatto, in una forma particolare —
  l'utente ha ascoltato più take e ne ha tenuti 3 (in
  `assets/audio/frasi_fisse/motto_jo/`), da scegliere a caso a runtime a ogni
  "colonna annullata" invece di una registrazione fissa unica (unico
  frammento/frase con più varianti tenute apposta; per tutto il resto vale la
  regola "una sola generazione"). Meccanismo di scelta random ancora da
  scrivere nel codice, insieme al resto della riproduzione audio (punto 8).
  `tocca_a_te` generata e salvata in `assets/audio/frasi_fisse/tocca_a_te.mp3`.
- Sezione 4 (suoni/effetti, elenco già fisso qui sotto): 12 effetti sonori
  (10 originali + 2 aggiunti in questa sessione: "Cambio Deck
  inquadrato/ascoltato" e "Passaggio di mano al giocatore umano", quest'ultimo
  colmava un buco fra sezione 3 del testo e l'elenco fisso), non ancora
  generati. Questi non sono voce (niente `voice_id`): vanno generati con la
  funzione ElevenLabs per effetti sonori, non con la sintesi vocale
  testo-parlato usata sopra.

Totale file audio ancora da creare: 12 (sezione 4, effetti sonori) —
volutamente saltata per ora su richiesta dell'utente, si riprende più avanti
(punto 12 dell'ordine dei lavori). Tutta la parte di voce (sezioni 1.1-1.4 e
2) è generata.

**Correzioni audio dopo riascolto completo (sessione 2026-09-09)**: l'utente
ha riascoltato tutti i frammenti e segnalato una lista di errori.
Rigenerati e sostituiti direttamente: `ess_con_un` (diceva "un con un" invece
di "con un"), e 29 numeri mal pronunciati (a volte con accento
francese/spagnolo, soprattutto i composti che finiscono in "tre" o
"cinque") — testo corretto preso dalla stessa funzione `numberToWords`, con
l'accento su "tré" nei composti (es. "quarantatré"). In attesa di scelta
dell'utente tra varianti multiple, generate ma NON ancora sostituite
nell'originale:
- `art_un` (leggeva "undo" in inglese): 3 varianti in
  `assets/audio/frammenti/connettivi/test_art_un/` (prompt "un un,").
- `pos_colonna` (leggeva "colona" con una N): 2 varianti in
  `assets/audio/frammenti/connettivi/test_pos_colonna/`.
- I nomi Roberto, Roger, Lorenzo (letti male): 2 varianti ciascuno in
  `assets/audio/frammenti/nomi/test_nomi/`. Nota su Roger: nessuna garanzia
  che le varianti risolvano la pronuncia all'inglese — va giudicato
  all'ascolto, eventualmente con un altro giro di tentativi.

**Aggiornamento**: `art_un` risolto — l'utente ha generato lui stesso il take
definitivo (non con questo assistente) e l'ha salvato come "un
definitivo.wav" nella cartella di prova; copiato come
`assets/audio/frammenti/connettivi/art_un.wav` (sostituendo il vecchio
`art_un.mp3` mal pronunciato), cartella di prova rimossa. Nomi: l'utente ha
ascoltato le due varianti per Roberto/Roger/Lorenzo, cancellato quelle che
non gli piacevano e tenuto una sola copia per nome nella cartella di prova;
copiate come definitive su `nome_roberto.mp3`, `nome_roger.mp3`,
`nome_lorenzo.mp3`, cartella di prova rimossa. **`pos_colonna` risolto**: le prime 2 varianti generate suonavano spagnole e
senza la doppia N, scartate. Rigenerate 4 nuove varianti con testi diversi
per forzare la pronuncia corretta; l'utente ha tenuto solo "Colonna"
(maiuscola isolata, senza bisogno di tagli — le altre pronunciavano la
parola due volte). Copiata come definitiva su
`assets/audio/frammenti/connettivi/pos_colonna.mp3`, cartella di prova
rimossa.

**Tutti i frammenti di voce (sezioni 1.1-1.4, 1.2, 1.3, 2) sono ora
generati e finalizzati** — nessuna correzione in sospeso. Restano solo i 12
effetti sonori (sezione 4, punto 12 dell'ordine dei lavori), volutamente
saltati per ora.

**Punto 6 (schermata iniziale) — fatto**, in TypeScript puro + Vite (nessun
framework, scelta esplicita dell'utente per mantenere pieno controllo su
ARIA/focus per VoiceOver; framework rimasto in sospeso per il resto della UI,
sarà rivalutato se emergesse un bisogno concreto). Aggiunto:
- `index.html` + `src/main.ts` come punto di ingresso Vite (`npm run dev` /
  `build` / `preview`, script aggiunti a `package.json`).
- `src/ui/router.ts`: router minimo basato su hash, sposta il focus
  sull'intestazione della schermata a ogni cambio (fondamentale per
  screen reader, verificato con un browser headless: annuncia la nuova
  schermata invece di lasciare il focus perso sul link appena attivato).
- `src/ui/screens/home.ts`: intestazione, segnaposto per la copertina
  (`role="img"` con etichetta descrittiva, punto 11 non ancora fatto),
  menu con landmark `nav` etichettato, i quattro pulsanti/link ("Gioca
  subito" è un `<button>`, gli altri tre sono link `<a href="#/...">`, la
  distinzione semantica corretta tra azione e navigazione).
- `src/ui/screens/placeholder.ts`: schermate segnaposto per i punti 7, 9, 10
  (non ancora costruiti), con link di ritorno alla schermata iniziale.
- `src/setup/matchConfig.ts` (+ test in `tests/setup/matchConfig.test.ts`,
  10 casi): logica pura e testata per "Gioca subito" — usa l'ultima
  configurazione salvata (`localStorage`) o, al primissimo avvio, il default
  un solo avversario Roberto livello 5 (spec, sezione 6), riusando
  `OPPONENT_ROSTER`/`DEFAULT_OPPONENT` già esistenti in `src/ai/`. La
  schermata di gioco a cui "Gioca subito" dovrebbe portare è il punto 8, non
  ancora costruito: per ora il pulsante risolve la configurazione reale e la
  mostra a schermo invece di navigare a vuoto.
- `tsconfig.json`: aggiunta la lib `"DOM"` (serve per `window`/`document`/
  `HTMLElement`, non necessaria finora perché tutto il codice era logica
  pura senza DOM).

Verificato con un browser headless (Chromium via Playwright, usato solo per
questa verifica e poi rimosso da `package.json` — non fa parte della
suite di test): intestazioni/landmark corretti, focus si sposta
sull'intestazione a ogni cambio di schermata, nessun errore in console.
`npm test` (147 test) e `npm run typecheck` verdi.

**Punti 7 e 8 (schermata "Scegli gli avversari" e schermata di gioco) —
fatti**, con alcune decisioni prese al volo (chiesto conferma all'utente
prima, tutte confermate):
- Fasce di difficoltà nella lista avversari: 3 fasce (Facile 1-3, Medio 4-7,
  Difficile 8-10) — `src/setup/difficulty.ts` + test.
- Spunta/deselezione avversario: salvataggio automatico a ogni modifica
  (niente pulsante "Salva" separato) — `toggleOpponent` in
  `src/setup/matchConfig.ts`, blocco con messaggio vocale chiaro se si esce
  dall'intervallo 1-7 (spec, sezione 6), verificato con un browser headless.
- Musica di sottofondo: nessun file audio pronto, quindi per ora solo
  segnaposto non funzionante nella schermata "Scegli gli avversari" (3
  tracce disabilitate + anteprima disabilitata), stesso trattamento della
  copertina.
- Profondità del punto 8: schermata di gioco reale, collegata al motore
  vero (`src/state`, `src/ai`, `src/engine`), turni funzionanti tra umano e
  IA — ma narrazione mostrata come testo (regioni `aria-live`), non ancora
  come audio in sequenza. Motivo: alcuni frammenti (`art_un`, `pos_colonna`,
  i tre nomi) aspettano ancora la scelta dell'utente tra le varianti di
  prova, avrebbe poco senso wireare l'audio prima. La riproduzione audio
  vera resta quindi l'ultimo pezzo aperto del punto 4, da fare con la sua
  sessione dedicata.

Nuovo modulo `src/play/` (logica pura, testata, nessun DOM):
- `src/play/rng.ts`: PRNG seedabile (mulberry32) usato per rendere coerenti
  "sbircia la carta che verrebbe pescata dal mazzo coperto" (serve per
  mostrare il valore prima che il giocatore/l'IA decida tenere-o-scartare)
  e "applica davvero il pescaggio" — senza, nel caso raro in cui il mazzo è
  vuoto proprio in quel momento (rimescolamento scarti, quindi consumo di
  casualità), le due chiamate a `drawFromDeck` potrebbero pescare carte
  diverse. Testato anche questo caso limite, non solo quello comune.
- `src/play/match.ts`: orchestrazione di una partita intera sopra
  `src/state`/`src/ai`/`src/engine`, già testati singolarmente ma mai
  collegati insieme prima d'ora — `buildMatchPlayers` (umano sempre primo,
  poi gli avversari scelti), `startMatch`/`applyHumanAction` (ogni mossa
  umana fa scorrere da sé i turni IA successivi fino al prossimo turno
  umano o fine manche), `finishRoundIfOver` (punteggio di manche, raddoppio,
  totali, prossima manche o partita finita a 100+). Test include una
  simulazione di manche completa fino a `round-over`.

Nuove schermate (`src/ui/screens/`):
- `opponents.ts` (punto 7): lista dei nove avversari con checkbox, livello e
  fascia; musica segnaposto; link di ritorno.
- `game.ts` (punto 8): la propria griglia (12 celle-pulsante, ognuna
  autodescrittiva via le stesse funzioni di `src/exploration/read.ts` che
  useranno l'audio — "riga due colonna uno: coperta" ecc.), scoperta
  iniziale, pesca dal mazzo/scarti con le due decisioni "tieni"/"scarta",
  pulsanti di esplorazione (leggi riga/colonna/Deck intero, cambia Deck in
  ascolto, somma punti) su qualunque Deck rispettando l'anti-imbroglio, log
  di narrazione testuale, stato manche/totali. Gestione del focus: le celle
  della griglia si aggiornano sul posto (mai ricreate) così il focus resta
  dov'era dopo ogni click; solo quando cambia davvero l'insieme dei
  pulsanti disponibili (dopo "Pesca dal mazzo", o dopo aver scelto
  tieni/scarta) il focus si sposta esplicitamente sul primo pulsante o
  messaggio nuovo.
- `home.ts`: "Gioca subito" ora è un link vero verso `#/game` (prima era un
  pulsante segnaposto).

Verificato tutto con un browser headless (Chromium via Playwright,
installato e rimosso di nuovo alla fine, non è una dipendenza permanente):
blocco min/max avversari con messaggio corretto, salvataggio
localStorage, scoperta iniziale, i tre percorsi di turno (prendi dagli
scarti, pesca-e-tieni, pesca-e-scarta con rifiuto su cella già scoperta),
turno che torna all'umano dopo la mossa IA, narrazione testuale
(confrontata a mano con gli esempi della sezione 3 dello spec — coincide
alla lettera), esplorazione con anti-imbroglio rispettato, nessun errore
console. `npm test` (163 test) e `npm run typecheck` verdi.

**Punto 4 chiuso del tutto — audio vero collegato alla schermata di
gioco.** Con tutte le correzioni di voce finalizzate (vedi sopra), fatto
l'ultimo pezzo rimasto aperto: "collegamento alla sintesi vocale di
sistema", cioè far suonare davvero i frammenti audio invece del solo testo.

- `src/narration/audioAssets.ts` (logica pura, testata): da un
  `NarrationToken` all'URL del file audio giusto — nomi
  (`nome_<slug>.mp3`), numeri/punteggi (via `numberToWords` + stesso slug
  usato per salvare i file, es. "quarantatré" → `num_quarantatre.mp3`),
  frasi/connettivi (`<chiave>.mp3`, tranne `art_un` che è `.wav`), le due
  frasi fisse (`tocca_a_te.mp3`; `motto_jo` sceglie a caso una delle 3
  varianti tenute dall'utente). Test (`tests/narration/audioAssets.test.ts`)
  verifica che OGNI frammento del vocabolario risolva a un file che esiste
  davvero sul disco — rifatto apposta dopo il bug preso in giro
  scrivendo questo file: lo slug non sostituiva lo spazio in "meno due"
  con "_", quindi `numberAudioUrl(-2)` puntava a un file inesistente
  ("meno due.mp3" invece di "meno_due.mp3"); il test l'ha preso subito.
- `src/ui/narrationPlayer.ts` (browser, non testato con vitest — solo
  `Audio` reale): coda seriale di frasi (mai sovrapposte), con una breve
  pausa silenziosa tra un frammento e l'altro secondo la punteggiatura
  del token (virgola più corta, punto più lunga).
- `src/ui/screens/game.ts`: sia la narrazione automatica dei turni sia i
  pulsanti di esplorazione (leggi riga/colonna/Deck, somma punti, cambia
  Deck in ascolto, lettura tattile delle celle) ora accodano anche l'audio
  vero, non solo il testo nel log/nelle regioni aria-live.

Verificato con un browser headless monitorando le richieste di rete verso
`/assets/audio/...`: la sequenza di frammenti scaricati per un turno IA
("Roger prende dagli scarti un tre, sostituisce riga uno colonna due. Era
coperta, ora scartata.") combacia esattamente coi token attesi, incluso il
file .wav di `art_un`; nessun errore console nell'intera sessione.

**Nota per lo sviluppo futuro (build/produzione)**: gli audio sono
referenziati con URL assoluti tipo `/assets/audio/...` e funzionano nel
dev server (`npm run dev`) perché Vite serve l'intera cartella del
progetto. Per una build di produzione (`npm run build`) andrà configurato
`publicDir` (o spostati/copiati gli asset sotto `public/`) perché
`assets/` non finisce automaticamente in `dist/` — non ancora fatto,
non ancora necessario finché non si pubblica davvero l'app.

**Punti 9 e 10 (Le tue partite, Extra) — fatti.**

Prima mancava del tutto un modo per salvare una partita: la schermata di
gioco ne creava sempre una nuova a ogni apertura, senza persistenza. Aggiunto
ora, con conseguenze anche sul punto 8:

- `src/play/match.ts`: `MatchState` ha un nuovo campo `roundScores` (i
  punteggi di ogni manche già conclusa, uno per manche — serve alla
  classifica), e `buildMatchPlayers`/`startMatch` accettano un `humanName`
  opzionale (default "Tu") per il nome personalizzato dell'Extra — sicuro da
  passare qui perché la narrazione non legge mai il nome dell'umano a
  prescindere da questo valore (verificato leggendo `narrateMove`/
  `narrateColumnCleared`, che per l'umano non chiamano mai `playerName`).
- `src/play/matchStorage.ts` (nuovo, testato): salvataggio delle partite in
  `localStorage` (`SavedMatch` = id, config, stato, timestamp),
  `loadAllMatches`/`upsertMatch`/`deleteMatch`/`getMatch`, e
  `buildShareText` per il riepilogo testuale semplice da condividere
  (punteggi per manche e totale, mai uno storico mosse, come richiesto).
- `src/setup/appSettings.ts` (nuovo, testato): impostazioni Extra
  (`humanPlayerName`, tre volumi separati 0-100, bio, email, link podcast,
  link donazioni), stesso pattern salva/carica/valida di `matchConfig.ts`.
- `src/ui/router.ts`: aggiunto il supporto a un segmento dinamico nel path
  (es. `/game/:id`) per riprendere una partita specifica — cambio
  compatibile all'indietro, le schermate esistenti non hanno dovuto cambiare
  firma.
- `src/ui/screens/game.ts`: ora, aprendo `#/game/<id>`, riprende esattamente
  quella partita salvata invece di iniziarne una nuova (se l'id non esiste
  più, si comporta come "Gioca subito"); ogni cambio di stato salva subito
  la partita (nessun pulsante "Salva" a parte, stessa convenzione già
  scelta per gli avversari); usa il nome personalizzato dell'Extra per il
  giocatore umano ovunque venga mostrato un nome (mai nella voce narrante);
  il volume della voce narrante impostato nell'Extra si applica davvero
  (letto a ogni frammento, non solo all'apertura della schermata) — musica e
  suoni di gioco restano solo salvati, non ancora collegati a nessun audio
  (nessun file pronto).
- `src/ui/screens/matches.ts` (punto 9): partite in corso (con "Riprendi")
  e concluse (con "Rivedi classifica" — punteggio per manche e totale —
  "Condividi" — `navigator.share` se disponibile, altrimenti testo in una
  casella copiabile con pulsante "Copia" — ed "Elimina" a doppia conferma
  in pagina, niente dialogo nativo del browser).
- `src/ui/screens/extra.ts` (punto 10): nome, tre volumi, bio, email, link
  podcast, link donazioni — salvataggio automatico a ogni modifica.

Verificato con un browser headless: nome personalizzato visibile ovunque
tranne che nella voce, ripresa di una partita in corso col log che dice
"Partita ripresa." e non riascolta gli eventi già sentiti prima, una manche
intera portata a `round-over` con punteggi/raddoppio corretti, comparsa
nell'elenco delle partite concluse, classifica per manche corretta,
condivisione testuale col contenuto giusto, eliminazione a doppia conferma
funzionante. Nessun errore console.

`npm test` (187 test) e `npm run typecheck` verdi.

Prossimo passo naturale: punto 11 (carte grafiche via Gemini) o punto 12
(effetti sonori, rimandato finora).

**Nota su un possibile limite superiore dei punteggi**: la soglia di 100
punti totali segna la fine partita, non un tetto assoluto — la regola del
raddoppio sul punteggio di manche di chi chiude senza avere il punteggio più
basso in solitaria può in teoria portare un totale oltre 200 in casi
estremi (un giocatore molto sfortunato può accumulare parecchio in tante
manche mentre gli altri restano sotto 100). Per questo, oltre all'intervallo
interamente registrato -20..200, esiste il meccanismo di collage 201-599
descritto sopra come rete di sicurezza — oltre 599 nessuna copertura, caso
ritenuto abbastanza remoto da non giustificarla.

**Schermata iniziale (punto 6), deciso finora**:
- Nomi definitivi dei pulsanti (già applicati in tutto lo spec): Gioca
  subito, **Scegli gli avversari** (era "Opzioni partita"), **Le tue
  partite** (era "Partite salvate"), **Extra** (era "Altro").
- Immagine di copertina scelta e salvata in
  `assets/immagini/copertina-motto-jo.jpg` — M verde menta maiuscola,
  cicciottosa, contorno nero; "Jo" in corsivo giallo fluo in basso a destra,
  sovrapposto alla gamba destra della M. **Da verificare prima di usarla
  nella schermata**: il file è ancora in formato .jpg (niente trasparenza
  vera, JPG non la supporta) e mostra uno sfondo a scacchi grigi — va
  chiarito se è un artefatto del caricamento in chat o se il file originale
  salvato dall'utente è davvero un .png con sfondo trasparente. Da
  controllare al prossimo giro guardando l'estensione del file scelto in
  fase di salvataggio da Gemini. "La modifichiamo" (parole dell'utente):
  quindi va ancora rifinita, non è la versione definitiva.
- Colori della schermata: non ancora decisi nel dettaglio. L'utente è cieco
  e non può valutare bozzetti visivi — vanno descritti a parole, non
  mostrati (vedi memoria di progetto).

**Da fare alla ripresa**: tutti i numeri (sezioni 1.1/1.3/1.4) e i nomi
(1.2) sono completi — generare le due frasi fisse (sezione 2), poi i 12
effetti sonori (sezione 4, lista estesa in questa sessione con "Cambio
Deck" e "Passaggio di mano al giocatore umano"). Da decidere anche il
dorso della carta (vedi `motto-jo-istruzioni-carte-gemini.md`, aggiunto in
questa sessione con le indicazioni per generare le 15 facce con Gemini in
modo coerente — dorso non ancora descritto). A parte,
resta ancora da decidere il framework UI per la web app (vanilla JS, React,
Vue, Svelte...), mai fissato finora (avevamo deciso solo "web app" contro
"app nativa", non il framework) — punto 6, da riprendere dopo l'audio o in
parallelo a piacere.

**Ambiente**: Node.js non era installato su questa macchina, l'ho aggiunto via
nvm (`~/.nvm`) con un symlink in `~/.local/bin` — `node`/`npm` sono quindi
disponibili in ogni nuova sessione di terminale senza altri passaggi.
Impostati anche due suoni globali di accessibilità (non specifici di questo
progetto, valgono in ogni sessione Claude Code): un "ding" quando finisco di
rispondere, un suono di allerta quando serve un'azione dell'utente — già
attivi, non c'è bisogno di rifarli. Repo git
inizializzato in locale ma senza nessun commit ancora creato (da fare solo
quando lo chiedi esplicitamente).

---

Web app accessibile del gioco di carte Skyjo, regole originali senza espansioni.
Un giocatore umano, da uno a sette avversari virtuali. Palette e family look
coerenti con Motto Chess (verde panno, oro, bordeaux scuro).

## 1. Regole di gioco (motore, nessuna interfaccia)

- Da due a otto giocatori totali (in v1: un umano più uno-sette virtuali;
  almeno un avversario è sempre obbligatorio).
- Mazzo da 150 carte, valori da meno due a dodici, distribuzione identica al
  gioco originale: 5 carte da -2, 10 carte da -1, 15 carte da 0, 10 carte per
  ciascun valore da 1 a 12 (5 + 10 + 15 + 10×12 = 150).
- Ogni giocatore riceve 12 carte coperte, disposte in griglia 4 colonne per 3
  righe: il proprio Deck.
- All'inizio di ogni manche, ogni giocatore sceglie e scopre 2 carte del
  proprio Deck (passo ripetuto a ogni manche della partita, non solo alla
  prima).
- Chi inizia la manche: nella prima manche della partita si usa il totale di
  queste due carte scoperte per stabilire chi parte (il totale più alto
  inizia); nelle manche successive parte invece chi ha chiuso per primo la
  manche precedente.
- A ogni turno il giocatore pesca dal mazzo coperto oppure prende la carta in cima
  agli scarti:
  - Pescando dal mazzo coperto: può tenerla e sostituirla con una carta della
    propria griglia (quella vecchia va scoperta e scartata), oppure scartarla
    subito e scoprire al suo posto una propria carta ancora coperta.
  - Prendendo dagli scarti: è obbligato a usarla per sostituire una carta della
    propria griglia, non può ributtarla senza far nulla.
- Se il mazzo coperto finisce le carte, gli scarti (tranne l'ultima carta
  buttata, che resta in cima) vengono rimescolati a formare il nuovo mazzo
  coperto.
- Regola speciale: se in una colonna tutte e tre le carte sono scoperte e hanno
  lo stesso valore, la colonna si scarta interamente e non conta più nel
  punteggio. Le colonne restanti slittano a sinistra per rioccupare lo spazio
  lasciato libero: la griglia resta sempre compatta e le posizioni si
  rinumerano di conseguenza.
- Il turno (manche) finisce quando un giocatore scopre tutta la sua griglia:
  tutti gli altri giocano un ultimo turno, poi si sommano i punti.
- Se chi ha chiuso il turno non ha il punteggio più basso in solitaria di
  quella manche (cioè un altro giocatore ha un punteggio uguale o inferiore),
  il suo punteggio di manche viene raddoppiato.
- I punti si sommano manche dopo manche. La partita finisce quando qualcuno
  raggiunge o supera 100 punti totali; vince chi ha il totale più basso.

## 2. Giocatori virtuali

Pool fisso di nove avversari, nome e livello di intelligenza non modificabili
dall'utente:

- Roberto, livello 5 (avversario di default al primo avvio dell'app)
- Elena, livello 10
- Lorenzo, livello 8
- Martina, livello 9
- Graziano, livello 2
- Marco, livello 3
- Roger, livello 1
- Alessandro, livello 7
- Aurora, livello 6

Comportamento per livello (profili predefiniti, non apprendimento automatico):

- Livello 1: scelte quasi casuali, ignora probabilità e convenienze ovvie.
- Livello 10: ricorda le carte già uscite dal mazzo per stimare le probabilità
  delle carte rimaste, valuta se prendere una carta dagli scarti anche solo per
  negarla a un avversario, decide con criterio quando chiudere il turno in base
  a quanto sono vicini gli altri alla chiusura. Nessuno scambio diretto di carte
  tra giocatori: non esiste nel gioco originale.
- Livelli intermedi: scalare gradualmente tra questi due estremi (definizione
  puntuale per livello da completare al punto 3 del piano lavori).

### Identità visiva del braccio (motore grafico, punto 5)

Per il braccio/zampa che compare durante il turno di ciascun avversario
virtuale (v1, vedi punto 5): un arto fisso e distintivo per personaggio,
coerente con chi rappresentano. Stile grafico fisso su tutti e nove:
cartone animato / anime giapponese, contorno netto, colori piatti e
vivaci, non fotorealistico (dettagli e prompt in
`motto-jo-istruzioni-carte-gemini.md`).

- **Roberto** (judoka): manica blu del judogi, avambraccio e mano scoperti,
  bordo della cintura visibile al polso.
- **Elena** (ballerina di danze caraibiche, ama il rosa, pelle chiarissima
  con lentiggini sul dorso delle mani): braccio nudo, pelle molto chiara con
  lentiggini visibili sul dorso della mano, fascia rosa al polso con
  disegnato un globo terrestre.
- **Lorenzo** (signore distinto ed elegante, camicia e giacca, bell'orologio):
  manica di camicia con polsino sotto la manica della giacca, orologio
  elegante visibile al polso.
- **Martina** (intraprendente, scrittrice, maniche lunghe spesso a tinta
  unita, braccialetti semplici in argento): manica lunga a tinta unita,
  braccialetti sottili in argento al polso.
- **Graziano** (maestro di danza completamente svalvolato, tute e abiti da
  danza caraibica, colori fluo): manica di tuta o costume da danza
  caraibica in colori fluo sgargianti, il più eccentrico del gruppo.
- **Marco** (25 anni, ballerino, casinista, sportivo ma con un certo look
  ricercato): manica sportiva con un dettaglio curato/a contrasto per il
  tocco ricercato.
- **Roger** (labrador nero, il cane dell'utente): zampa nera da labrador,
  senza vestiti.
- **Alessandro** (19 anni, bravo e serio, t-shirt a maniche corte, adora i
  semafori): braccio nudo da maniche corte, braccialetto in cuoio con un
  semaforo illuminato.
- **Aurora** (19 anni, adora felpe lunghe di misura più grande della sua
  taglia): manica di felpa oversize, lunga, mano che sbuca a fatica dal
  polsino.

Il giocatore umano non ha un braccio proprio (vedi punto 5): non essendo
nota la sua persona (aspetto, genere) all'app, si è scelto di non mostrarne
uno per evitare un'assunzione arbitraria.

## 3. Motore narrativo (accessibilità)

Convenzione fissa in tutta l'app: riga prima, colonna dopo ("riga due colonna uno").
Le righe si leggono da sinistra, le colonne dall'alto.

Terminologia fissa: "mazzo" indica sempre la pila di pesca (mazzo coperto) o
gli scarti; l'insieme delle carte di un giocatore si chiama "Deck".

Pulsanti di lettura:
- Leggi una riga (indicando il numero)
- Leggi una colonna (indicando il numero)
- Leggi l'intero Deck in ascolto, riga per riga
- Cambia Deck in ascolto (proprio o di un avversario), con annuncio di chi si
  sta ascoltando, accompagnato dal suono "Cambio Deck" (sezione 4)
- Somma punti delle carte scoperte del Deck in ascolto, con frase fissa (mai
  il punteggio finale, solo quello parziale visibile): forma diversa per il
  proprio Deck (self-referenziale, mai il proprio nome) e per quello di un
  avversario (nome fisso). Testo esatto in `motto-jo-frasi-narrazione.md`.

Esplorazione tattile in parallelo ai pulsanti: muovendo il dito sulla griglia
si sente la posizione e, se scoperta, il valore.

Regola anti-imbroglio: quando si ascolta il Deck di un avversario, le carte
ancora coperte restano coperte anche nella narrazione (si annuncia solo la
posizione e che è coperta, mai il valore).

Narrazione automatica dei turni degli avversari (mai per il turno del giocatore
umano, che decide da sé con i pulsanti/VoiceOver). Ordine fisso degli elementi
della frase:
1. Nome del giocatore
2. Fonte: "pesca dal mazzo" oppure "prende dagli scarti"
3. Azione: "scarta" oppure "sostituisce" una posizione
4. Solo se sostituisce: posizione, cosa c'era prima (coperta o valore), cosa
   c'è ora

Testo esatto di tutte le frasi e i frammenti, comprese le varianti per lo
scarto diretto e per la sostituzione: `motto-jo-frasi-narrazione.md`.

Impostazione di verbosità (essenziale / dettagliata), salvabile:
- Dettagliata: frase completa come sopra.
- Essenziale: solo l'esito, senza il "prima/dopo".

Eventi sempre narrati per esteso, in qualunque livello di verbosità:
- Colonna completata e annullata: prima il suono speciale, poi sempre
  "Motto Gioooooo!" (grafia fonetica per la sintesi vocale, vedi
  `motto-jo-frasi-narrazione.md`), poi la frase informativa per esteso.
- Chiusura del turno da parte di qualcuno.
- Passaggio di mano al giocatore umano: suono più frase breve fissa, poi
  silenzio.

Per queste tre, come per tutto il resto: se il giocatore coinvolto è quello
umano, la frase usa una forma alla seconda persona invece del nome (mai il
nome libero dell'utente pronunciato dalla voce narrante — vedi
`motto-jo-frasi-narrazione.md`, regola trasversale in cima al file).

## 4. Suoni (effetti generati con ElevenLabs, elenco fisso v1)

- Mescolio carte
- Disposizione carte sul tavolo
- Pesca di una carta dal mazzo coperto
- Presa di una carta dagli scarti (suono distinto dal precedente)
- Drop/scarto di una carta
- Colonna completata e annullata (seguito sempre da "Motto Gioooooo!")
- Ultimo turno
- Vittoria manche
- Vittoria partita totale
- Sconfitta (suono unico, uguale sia per manche che per partita totale)
- Cambio Deck inquadrato/ascoltato: suona sia per lo switch manuale in
  esplorazione (punto 5, per sentire cosa hanno gli altri) sia per lo
  scorrimento automatico della visuale a ogni fine turno (proprio o di un
  avversario, punto 5 del motore grafico). Non suona quando il cambio porta
  il turno proprio all'umano: in quel caso resta solo il suono dedicato
  qui sotto, per evitare due suoni in sequenza.
- Passaggio di mano al giocatore umano: suono dedicato già previsto nella
  sezione 3 di questo documento ma prima mancante da questo elenco fisso —
  aggiunto qui. Ha priorità sul suono di cambio Deck qui sopra: quando tocca
  all'umano suona solo questo, seguito da "Tocca a te." poi silenzio.

Regola generale: suono breve prima, poi con piccolo ritardo la vocalizzazione.

## 5. Motore grafico

- Carte numerate e dorso generati dall'utente con Gemini; verifica di
  corrispondenza a cura di Claude (dimensioni e proporzioni uguali tra tutte
  le carte, stessa posizione del numero, coerenza della codifica a colori per
  fascia di valore, leggibilità del numero anche ridimensionato).
- Fasce di valore come nello Skyjo originale, stessa progressione fredda→calda
  al crescere del valore, ricolorata sulla palette Motto:
  - -2, -1: blu ardesia scuro (tono aggiunto, non presente nella palette
    Motto Chess, necessario per coprire la fascia più fredda)
  - 0: avorio/crema chiaro (tono aggiunto, base neutra chiara)
  - 1-4: verde panno (brand Motto)
  - 5-8: oro (brand Motto)
  - 9-12: bordeaux scuro (brand Motto)
- Numero sempre su una pastiglia/riquadro bianco-avorio uguale su tutte le
  carte, con cifra in carbone quasi-nero (non nero puro, per ridurre
  l'abbagliamento): garantisce un contrasto numero/sfondo costante e massimo
  (obiettivo ≥7:1, livello WCAG AAA) indipendentemente dal colore di fascia,
  pensato per la leggibilità da parte di utenti ipovedenti.
- Il colore di fascia non è mai l'unico indicatore del valore: il numero
  resta sempre l'informazione principale, leggibile allo stesso modo su ogni
  carta grazie alla pastiglia fissa.
- **Decisione presa generando le carte (punto 11)**: pensando a schermi
  piccoli (soprattutto smartphone), il colore di fascia diventa una
  **cornice sottile** (~8% della larghezza carta) sui quattro lati invece
  che sfondo pieno, e la pastiglia bianca riempie quasi tutta la carta
  (~80% della larghezza) per lasciare al numero la massima dimensione
  possibile — il colore resta un indizio secondario, il numero è sempre
  quello dominante. Dettagli e prompt in
  `motto-jo-istruzioni-carte-gemini.md`.
- Le immagini delle carte non hanno bisogno di trasparenza: sono
  rettangoli pieni, gli angoli arrotondati si applicano a schermo via CSS
  (`border-radius` + `overflow: hidden`), non servono nell'immagine
  sorgente. Le braccia/zampe invece sì (sagoma irregolare sovrapposta alla
  schermata): generate su sfondo magenta puro `#FF00FF` (chroma key, mai
  presente nella palette Motto) e rese trasparenti con
  `scripts/chroma-key.mjs` (scritto e testato).
- Quando è il turno di un giocatore, la visuale passa al suo Deck: v1 con
  semplice evidenziazione del Deck attivo e movimento della carta dal mazzo
  alla griglia. Questo cambio di visuale è accompagnato dal suono "Cambio
  Deck" (sezione 4), tranne quando il turno passa proprio all'umano (lì
  suona solo il suono dedicato di passaggio di mano, sezione 4).
- Braccio/zampa per il turno degli avversari virtuali (in v1, non più
  rimandato a v2): un solo arto per personaggio, identità visiva fissa per
  ciascuno dei nove — vedi elenco completo in sezione 2. Compare dal bordo
  inferiore dello schermo e si sposta fino al punto di interazione (es. dal
  mazzo coperto o dagli scarti dove preleva la carta, poi fino alla cella
  della propria griglia che sostituisce): spostamento semplice punto a
  punto, non una vera animazione articolata (niente piegamento di
  gomito/spalla, solo cambio di posizione, eventualmente con una
  transizione lineare per l'effetto di scivolamento). Il giocatore umano
  non ha un braccio proprio: non essendo nota la sua persona (aspetto,
  genere) all'app, si è scelto di non mostrarne uno per evitare
  un'assunzione arbitraria.

## 6. Schermata iniziale

- Nome del gioco in alto
- Immagine di copertina
- Pulsanti: Gioca subito, Scegli gli avversari, Le tue partite, Extra
- "Gioca subito" usa sempre l'ultima configurazione salvata. Al primissimo
  avvio in assoluto, default universale: un solo avversario, Roberto,
  livello 5.

### Scegli gli avversari
- Lista con caselle dei nove avversari nominati, ciascuno con livello e
  fascia di difficoltà dichiarata accanto al nome, non modificabile.
- Minimo un avversario obbligatorio, massimo sette selezionabili: se si esce
  da questo intervallo, blocco con avviso vocale chiaro.
- Musica di sottofondo opzionale, fino a tre brani selezionabili, ciascuno
  con anteprima ascoltabile.
- Nota per v2: scelta tra mazzo classico e mazzo con carte nuove, da
  rivedere in seguito.

### Le tue partite
- Riprendi partite non concluse.
- Rivedi partite concluse: classifica punti per giocatore, per manche e
  totale.
- Elimina o condividi (condivisione come riepilogo testuale semplice di
  punteggi per manche e totale, non un file di storico mosse).

### Extra
- Nome del giocatore umano (testo libero, modificabile), usato solo per la
  visualizzazione a schermo e nei riepiloghi delle partite salvate: non viene
  mai pronunciato dalla voce narrante (vedi punto 3).
- Volumi separati: musica di sottofondo, suoni di gioco, voce narrante.
- Breve biografia dell'utente, email di contatto, link al sito del podcast,
  link per donazioni PayPal.

## 7. Schermata di gioco

Visibili sempre: proprio Deck (griglia), mazzo coperto, ultima carta
scartata. Accesso ai pulsanti del motore narrativo descritti al punto 3.

---

# Capitolo finale — ordine dei lavori da terminale

Elenco da seguire in sequenza durante lo sviluppo con Claude Code. Cancellare
ogni voce man mano che viene completata e verificata, prima di passare alla
successiva.

1. [x] Motore di gioco puro: generazione mazzo, distribuzione carte, validazione
       mosse (pesca da mazzo/scarti, sostituzione, scarto diretto), regola della
       colonna uguale (con slittamento a sinistra), calcolo punteggio di manche
       e totale, raddoppio per chi chiude senza punteggio minimo in solitaria,
       determinazione di chi inizia ogni manche, rimescolamento degli scarti
       quando il mazzo coperto si esaurisce, condizione di fine manche e fine
       partita. Nessuna interfaccia, solo logica testabile.
2. [x] Gestore di stato e turni: turno corrente, mano di ciascun giocatore,
       stato mazzo/scarti, storico mosse della manche corrente.
3. [x] Profili di intelligenza dei nove avversari (livelli 1-10), collegati ai
       nomi fissi definiti al punto 2 delle specifiche.
4. [ ] Motore narrativo testuale: generazione delle frasi per ogni evento di
       gioco (turno avversario, punteggio a richiesta, colonna annullata,
       ultimo turno, passaggio di mano), nelle due varianti essenziale e
       dettagliata. Collegamento alla sintesi vocale di sistema.
5. [x] Comandi/pulsanti di esplorazione: lettura riga, lettura colonna, lettura
       Deck intero, cambio Deck in ascolto, somma punti carte scoperte.
       Verifica della regola anti-imbroglio sulle carte coperte altrui.
6. [ ] Schermata iniziale: struttura e pulsanti (Gioca subito, Scegli gli avversari,
       Le tue partite, Extra), con placeholder per copertina e link esterni.
7. [ ] Schermata Scegli gli avversari: lista avversari con caselle e limite
       minimo uno/massimo sette, selezione musica con anteprima.
8. [ ] Schermata di gioco: griglia propria (Deck), mazzo coperto, scarti,
       pulsanti del motore narrativo, evidenziazione del Deck attivo a ogni
       cambio turno, braccio/zampa del personaggio in turno che compare dal
       basso e si sposta ai punti di interazione (punto 5, nessun braccio
       per il giocatore umano).
9. [ ] Schermata Le tue partite: elenco, ripresa partita, visualizzazione
       classifica, eliminazione e condivisione come riepilogo testuale.
10. [ ] Schermata Extra: volumi separati, bio, email, link podcast, link
        donazioni.
11. [ ] Integrazione carte grafiche generate con Gemini, con verifica di
        coerenza (dimensioni, posizione numero, codifica colori secondo la
        palette Motto) prima dell'inserimento definitivo. Da generare allo
        stesso modo i nove bracci/zampe (identità visiva per personaggio,
        sezione 2), non ancora iniziati.
12. [ ] Integrazione suoni effetto generati con ElevenLabs secondo l'elenco
        fisso del punto 4 delle specifiche, collegati ai rispettivi eventi.
13. [ ] Test completo di una manche e di una partita intera fino a 100 punti,
        con verifica di tutti i casi speciali: colonna annullata, chiusura
        turno, raddoppio punteggio, vittoria e sconfitta.
