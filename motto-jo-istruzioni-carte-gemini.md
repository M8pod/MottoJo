# Motto Jo — Istruzioni per generare le carte e le braccia con Gemini

Riferimento pratico per generare con Gemini le 15 facce numerate (valori
-2..12) più il dorso (punto 11 della roadmap), e i nove bracci/zampe dei
personaggi. Le regole di base sono in `motto-jo-specifiche-v1.md`, sezioni 2
e 5 — questo file le traduce in prompt operativi.

**Aggiornato dopo una discussione su due problemi concreti**: la
trasparenza vera non si ottiene salvando in .jpg (nessun canale alpha), e
anche chiedendo "sfondo trasparente" a Gemini il risultato non è affidabile
(a volte disegna letteralmente uno sfondo a scacchi invece di una vera
trasparenza, che poi resta incollato nei pixel). Le due categorie di
immagine hanno bisogno reale di cose diverse, quindi due approcci diversi:

- **Le carte non hanno bisogno di trasparenza**: sono rettangoli, li
  useremo sempre come rettangoli nell'app. Gli angoli arrotondati si
  applicano con CSS quando le mostriamo a schermo (`border-radius` +
  `overflow: hidden`), non serve che Gemini li disegni né che ci sia
  trasparenza intorno. Questo elimina il problema alla radice per le carte.
- **Le braccia hanno davvero bisogno di trasparenza** (sagoma irregolare,
  vanno sovrapposte alla schermata di gioco). Per queste, invece di
  chiedere trasparenza a Gemini (inaffidabile), si chiede uno **sfondo a
  tinta unita di un colore inconfondibile** (chroma key, magenta puro
  `#FF00FF` — non presente nella palette Motto, quindi impossibile da
  confondere con un elemento vero del disegno). Salvi il file così com'è
  (anche .jpg va benissimo, non serve trasparenza in questa fase), e lo
  elaboro io con uno script (`scripts/chroma-key.mjs`, già scritto e
  testato) che toglie il magenta e lo rende trasparenza vera in un PNG.

## Perché la coerenza conta

L'app è pensata anche per utenti ipovedenti: dimensioni, posizione del
numero e contrasto devono restare **identici** su tutte le carte, altrimenti
chi si affida parzialmente alla vista perde il punto di riferimento che ha
imparato a riconoscere.

## Un blocco unico o 15 immagini separate?

**Meglio 15 immagini separate** (una per valore), non un unico collage:
- Risoluzione piena per ogni carta invece che condivisa tra 15 riquadri.
- I modelli generativi tendono a sbagliare le cifre quando devono scriverne
  tante, piccole, dentro un'unica composizione affollata — un rischio reale
  proprio sul dettaglio più importante (il numero).
- Se una carta viene male, la rigeneri da sola invece di rifare tutto il
  blocco.
- Il metodo "carta di riferimento + immagine guida" qui sotto tiene la
  coerenza tra generazioni separate quasi quanto un batch unico, senza i
  suoi svantaggi.

## Il numero prima del colore (importante su schermo piccolo)

Hai ragione a voler dare più peso al numero che al colore di fascia: su un
telefono le carte saranno piccole, e una sottile differenza di tinta tra
"oro" e "bordeaux" si nota molto meno di quanto si legga una cifra grande.
Il colore di fascia resta (serve anche a chi ha un residuo visivo che
percepisce blocchi di colore anche senza distinguere bene le cifre, ed è
già una regola dello spec: mai l'unico indicatore), ma cambio le
proporzioni per dargli un ruolo secondario:

- **Prima (v1 originale)**: sfondo pieno colore di fascia, pastiglia
  bianca al centro grande circa il 55% della larghezza carta.
- **Ora**: il colore di fascia diventa una **cornice sottile** (~8% della
  larghezza) sui quattro lati, e il riquadro bianco-avorio con il numero
  riempie quasi tutta la carta (~80% della larghezza) — il numero può
  quindi essere molto più grande. La pastiglia bianca resta comunque
  essenziale (non un capriccio estetico): è quello che garantisce lo stesso
  contrasto cifra/sfondo su ogni carta, a prescindere dal colore di fascia
  sotto — un testo scuro che funziona bene su sfondo oro chiaro non
  funzionerebbe altrettanto su bordeaux scuro, la pastiglia bianca elimina
  il problema del tutto.

## Parametri fissi (uguali su tutte le 15 facce)

- **Proporzioni carta**: rapporto 5:7 (es. 500×700 px). **Niente angoli
  arrotondati nell'immagine, niente trasparenza**: rettangolo pieno,
  arrotondiamo dopo via CSS.
- **Cornice**: colore di fascia (tabella sotto), spessore uniforme circa
  l'8% della larghezza della carta, sui quattro lati.
- **Riquadro del numero**: bianco-avorio `#FAF7EF`, angoli leggermente
  arrotondati, riempie quasi tutto lo spazio dentro la cornice (~80% della
  larghezza totale della carta).
- **Cifra**: font sans-serif bold/black (il più pesante e leggibile che
  Gemini sa fare), colore carbone quasi-nero `#221F1C` (mai nero puro),
  enorme e ben centrata nel riquadro, contrasto cifra/sfondo target ≥7:1
  (WCAG AAA), leggibile anche molto rimpicciolita.
- **Nessun altro elemento decorativo**: niente texture, pattern, icone o
  ombre vicino al numero.

## Mappa valore → colore di fascia

| Valori | Fascia | Colore indicativo |
| --- | --- | --- |
| -2, -1 | blu ardesia scuro (tono aggiunto) | `#2E3A4A` |
| 0 | avorio/crema chiaro (tono aggiunto) | `#F1E9D8` |
| 1, 2, 3, 4 | verde panno (brand Motto) | `#4B6A43` |
| 5, 6, 7, 8 | oro (brand Motto) | `#C9A227` |
| 9, 10, 11, 12 | bordeaux scuro (brand Motto) | `#5C1A2B` |

## Metodo consigliato per non perdere coerenza tra generazioni separate

1. Genera per prima la **carta di riferimento** (valore 1, fascia verde
   panno) con il prompt qui sotto.
2. Per le altre 14, riusa lo stesso prompt cambiando solo colore di fascia
   e cifra — **allega la carta di riferimento come immagine guida** se
   l'interfaccia di Gemini lo permette, chiedendo esplicitamente di
   mantenere layout, proporzioni e stile identici, cambiando solo cornice e
   numero.
3. Salva ogni carta in `assets/immagini/carte/carta_<valore>.jpg` (es.
   `carta_meno2.jpg`, `carta_0.jpg`, `carta_12.jpg` — usa "meno" invece del
   segno per i nomi file, coerente con gli altri asset del progetto).
4. Dopo ogni generazione, verifica di coerenza a mio carico (dimensioni,
   posizione del numero, colore, leggibilità anche ridotta) prima
   dell'inserimento definitivo — già previsto nello spec.

## Prompt di partenza (carta di riferimento, valore 1)

```
Carta da gioco digitale, illustrazione piatta e pulita, stile moderno.
Rettangolo pieno con angoli retti (NON arrotondati, NON generare
trasparenza: sfondo pieno su tutto il rettangolo), proporzioni 5:7
(larghezza:altezza). Cornice sottile a tinta unita colore verde panno
#4B6A43, spessa circa l'8% della larghezza della carta, uguale sui quattro
lati. All'interno della cornice, un riquadro bianco-avorio (#FAF7EF) con
angoli leggermente arrotondati che riempie quasi tutto lo spazio residuo
(circa l'80% della larghezza totale della carta). Al centro del riquadro,
un numero enorme — il più grande possibile restando ben proporzionato e
centrato — con la cifra "1" in un font sans-serif bold o black, colore
carbone quasi-nero #221F1C, altissimo contrasto, leggibilissima anche molto
rimpicciolita (pensa a come apparirebbe su un piccolo schermo di
smartphone). Nessun altro elemento grafico, nessuna texture, nessuna ombra.
```

Per le altre 14 basta ripetere lo stesso prompt cambiando il colore di
cornice (tabella sopra) e la cifra nel riquadro (col segno meno per -2 e
-1: "-2", "-1").

## Dorso (retro carta)

**Non ancora deciso** — idee possibili: stesso family look della copertina
(M verde menta su sfondo scuro), oppure un motivo neutro a tinta unita con
un piccolo monogramma "Motto Jo" al centro. Dimmi come lo vuoi quando hai
un attimo.

## Braccia/zampe dei personaggi (spec, sezione 2)

Servono davvero trasparenti (sagoma irregolare sovrapposta alla schermata
di gioco). Sfondo **magenta puro `#FF00FF`** da chiedere esplicitamente a
Gemini (mai usato nella palette Motto, quindi il mio script può toglierlo
senza il rischio di cancellare per errore un pezzo vero del disegno).
Salva ogni braccio in `assets/immagini/braccia/<nome>.jpg` (o .png, non
importa, tanto lo rielaboro io), poi te lo confermo dopo aver passato lo
script `scripts/chroma-key.mjs` (produce un PNG con trasparenza vera).

**Stile fisso, uguale sui nove**: cartone animato / anime giapponese —
tratto pulito e definito (contorno netto, tipo "cel shading"), colori
piatti e vivaci, niente resa fotorealistica né texture di pelle/tessuto
realistiche. Coerente con la copertina già scelta (la M mascotte
cicciottosa e dal contorno netto è già in quello spirito).

### Prompt comune a tutte le nove

```
Illustrazione in stile cartone animato / anime giapponese, tratto pulito e
definito con contorno netto (cel shading), colori piatti e vivaci, non
fotorealistico. Un solo braccio (o zampa) destro, tagliato a metà avambraccio,
inquadrato come se emergesse dal bordo inferiore di uno schermo verso
l'alto, leggermente di scorcio. Sfondo pieno a tinta unita magenta puro
#FF00FF, uniforme su tutta l'immagine (verrà tolto dopo via software:
nessun elemento del disegno deve usare questo esatto colore magenta,
altrimenti verrebbe cancellato per errore insieme allo sfondo). Bordo
netto e pulito tra il braccio e lo sfondo, senza ombre proiettate sullo
sfondo e senza sfumature ampie ai bordi, per permettere un ritaglio
preciso. [dettagli specifici del personaggio qui sotto]
```

- **Aurora** (19 anni, adora felpe lunghe di misura più grande della sua
  taglia): manica di felpa oversize, lunga, mano che sbuca a fatica dal
  polsino.

## Pipeline dopo la generazione

1. Salvi i file (carte in `assets/immagini/carte/`, braccia in
   `assets/immagini/braccia/`, qualunque formato Gemini offra — non serve
   trasparenza in questa fase).
2. Per le braccia, io lancio `node scripts/chroma-key.mjs <input>
   assets/immagini/braccia/<nome>.png` per togliere il magenta e ottenere
   una trasparenza vera — già scritto e testato su un'immagine di prova
   sintetica (sfondo magenta + forma colorata: sfondo tolto correttamente,
   forma preservata).
3. Verifico coerenza (dimensioni, posizione/leggibilità del numero sulle
   carte, pulizia del ritaglio sulle braccia) prima dell'inserimento
   definitivo nell'app.
