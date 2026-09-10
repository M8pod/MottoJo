# Motto Jo — Frasi e frammenti vocali

Riferimento testuale completo per la generazione audio con ElevenLabs.
Richiamato da `motto-jo-specifiche-v1.md`, sezione 3 (motore narrativo).

Strategia in due livelli, spiegata e concordata durante lo sviluppo:

1. **Frammenti riutilizzabili**, concatenati al volo dal motore narrativo
   (`src/narration/`): numeri, nomi, connettivi. Le combinazioni possibili
   nella narrazione dei turni sono migliaia — non si possono registrare come
   frasi intere, si registra solo l'inventario finito di frammenti qui sotto.
2. **Frasi fisse intere**, poche e mai composte con variabili: si registrano
   una volta sola (eventualmente in un'unica sessione, poi tagliate).

Il codice in `src/narration/fragments.ts` implementa esattamente l'elenco di
questo file: se cambia una frase, va aggiornata in entrambi i posti.

Regola trasversale, valida per ogni frase qui sotto: il nome del giocatore
umano (testo libero, vedi spec sezione 6 "Altro") non viene **mai**
pronunciato. Ovunque una frase nominerebbe il giocatore di turno/in
ascolto/che completa una colonna o la manche, se è il giocatore umano si usa
una forma alla seconda persona ("tue carte", "Completi la colonna...") al
posto del nome — così tutto l'audio resta pre-generabile con ElevenLabs,
senza bisogno di sintesi vocale live per un testo arbitrario.

## 1. Frammenti riutilizzabili

### 1.1 Numeri (valori carta, righe, colonne)

Un solo set di frammenti, riusato sia per i valori delle carte (-2..12) sia
per righe (1-3) e colonne (1-4), che si leggono con la stessa numerazione
cardinale ("riga due colonna uno", mai "riga seconda").

| Valore | Frammento | Chiave codice |
| --- | --- | --- |
| -2 | "meno due" | `num_meno_due` |
| -1 | "meno uno" | `num_meno_uno` |
| 0 | "zero" | `num_zero` |
| 1 | "uno" | `num_uno` |
| 2 | "due" | `num_due` |
| 3 | "tre" | `num_tre` |
| 4 | "quattro" | `num_quattro` |
| 5 | "cinque" | `num_cinque` |
| 6 | "sei" | `num_sei` |
| 7 | "sette" | `num_sette` |
| 8 | "otto" | `num_otto` |
| 9 | "nove" | `num_nove` |
| 10 | "dieci" | `num_dieci` |
| 11 | "undici" | `num_undici` |
| 12 | "dodici" | `num_dodici` |

### 1.2 Nomi dei nove avversari

Fissi, dallo spec sezione 2 — nessun frammento vocale per il nome del
giocatore umano (vedi regola trasversale in cima al file).

Roberto, Elena, Lorenzo, Martina, Graziano, Marco, Roger, Alessandro, Aurora.

### 1.3 Connettivi

| Chiave | Testo |
| --- | --- |
| `fonte_mazzo` | "pesca dal mazzo" |
| `fonte_scarti` | "prende dagli scarti" |
| `az_scarta` | "scarta un" |
| `az_tiene` | "tiene un" |
| `az_sostituisce` | "sostituisce" |
| `art_un` | "un" (articolo indeterminativo isolato, per gli "un {valore}" che non seguono direttamente `az_scarta`/`az_tiene`). **Rifatto** dall'utente stesso (la generazione automatica leggeva "undo" in inglese): file definitivo `assets/audio/frammenti/connettivi/art_un.wav` — unico frammento in .wav invece di .mp3 (nessun encoder mp3 disponibile su questa macchina per convertirlo, formato comunque riproducibile allo stesso modo da qualunque player web; da uniformare a .mp3 più avanti se capita l'occasione, non urgente). |
| `pos_riga` | "riga" |
| `pos_colonna` | "colonna" |
| `esito_scopre` | "Scopre" |
| `esito_era_coperta` | "era coperta" |
| `esito_ora_e_un` | "ora è un" |
| `esito_li_cera_un` | "Lì c'era un" |
| `esito_era_coperta_ora_scartata` | "Era coperta, ora scartata." |
| `esito_ora_scartato` | "ora scartato." |
| `ess_scambia` | "scambia" |
| `ess_con_un` | "con un" |
| `ess_e_scopre` | "e scopre" |
| `colonna_completa` | "completa la colonna" |
| `colonna_completa_tu` | "Completi la colonna" |
| `colonna_annullata` | "annullata." |
| `chiusura_scopre_ultima` | "scopre l'ultima carta, ultimo turno per tutti gli altri." |
| `chiusura_scopri_ultima_tu` | "Scopri l'ultima carta, ultimo turno per tutti gli altri." |
| `punti_altrui` | "Punti dalle carte scoperte," |
| `punti_propri` | "Punti dalle tue carte scoperte:" |
| `totale` | "totale" |
| `coperta` | "coperta" |
| `deck_di` | "Deck di" |
| `il_tuo_deck` | "il tuo Deck" |
| `ora_ascolti` | "Ora ascolti" |
| `hai_pescato` | "Hai pescato," — annuncia in automatico al giocatore umano quale carta ha appena pescato dal mazzo coperto (prima che scelga se tenerla o scartarla), unica eccezione alla regola "il turno umano non si narra mai": qui non si narra una decisione, solo un fatto (il valore pescato) che altrimenti sarebbe visibile solo a schermo. File: `assets/audio/frammenti/connettivi/hai_pescato.mp3`, stessa voce e convenzione (virgola finale) di tutti gli altri connettivi. |
| `parola_punti` | "punti" — si incolla dopo un numero di punteggio ovunque il narratore annunci un totale (pulsante "somma punti", sezione 3.6; annuncio di chi inizia la manche, sezione 3.11), così non resta solo il numero nudo. Nessuna virgola/punto: la pausa finale è sempre il `pause(".")` del chiamante. |
| `inizia_manche` | "Inizia" — apre l'annuncio di chi inizia la manche quando è un avversario, si incolla al nome (sezione 3.11). |
| `inizia_manche_tu` | "Inizi tu," — stessa apertura, forma alla seconda persona quando inizia il giocatore umano (mai il nome, regola trasversale). |
| `inizio_con` | "con" — si incolla al numero di punti nell'annuncio di chi inizia la manche (sezione 3.11). |

### 1.4 Numeri generici (punteggi)

I valori di carta (tabella 1.1) coprono solo -2..12. Un punteggio ("somma
punti" di un Deck, punteggio di partita) può essere qualunque intero — non
un insieme chiuso di 15 parole, quindi non basta la tabella 1.1. Il codice
(`src/narration/numbers.ts`) compone la parola secondo la grammatica
italiana standard (unità, "dici-", decine con elisione su 1/8 e accento su
3: "ventuno", "ventotto", "ventitré", "cento" + resto...).

Per l'audio, ogni parola composta va registrata per intero (mai spezzata in
sillabe: "ventitré" è una sola registrazione, non "venti" + "tre" incollati,
che suonerebbe innaturale). Intervallo pratico consigliato da pre-generare:
almeno -20..150 (copre le somme negative possibili su un Deck parziale e i
punteggi di partita fino a poco sopra la soglia di 100).

## 2. Frasi fisse intere

Numero chiuso, mai composte con variabili — si prestano a una lettura
unica poi tagliata.

| Chiave | Testo |
| --- | --- |
| `motto_jo` | "Motto Gioooooo!" (grafia fonetica: "Gio" invece di "Jo" perché una voce italiana potrebbe leggere "Jo" con un suono sbagliato; da recitare con grande enfasi). **Generato**: 3 take scelti dall'utente dopo ascolto (`assets/audio/frasi_fisse/motto_jo/gioooo__trionfante_risata.mp3`, `jo__grido_entusiasta.mp3`, `jo__trionfante_risata.mp3`) — a differenza di ogni altro frammento/frase (una sola registrazione), qui si tengono 3 varianti apposta: a runtime, ogni volta che scatta l'evento "colonna annullata" (sezione 3.3), se ne sceglie una a caso, per non far sentire sempre la stessa esclamazione nelle partite con molte colonne completate. Meccanismo di scelta random da implementare nel codice insieme al punto 8 (schermata di gioco), come il resto della riproduzione audio. |
| `tocca_a_te` | "Tocca a te." **Generato**: `assets/audio/frasi_fisse/tocca_a_te.mp3`. |
| `invito_scopri_due` | "Scopri due carte del tuo Deck per iniziare." — recitata una volta a ogni inizio manche (mai su una partita ripresa alla stessa manche), subito dopo gli effetti "Mescolio"/"Disposizione": senza VoiceOver attivo, chi gioca non aveva altrimenti nessun indizio su cosa fare a inizio manche (bug segnalato dall'utente). File: `assets/audio/frasi_fisse/invito_scopri_due.mp3`. |

## 3. Modelli di frase completi

### 3.1 Turno avversario — pesca dal mazzo, scarta e scopre

- **Dettagliata**: "{nome} pesca dal mazzo, scarta un {valore scartato}.
  Scopre riga {riga} colonna {colonna}: era coperta, ora è un {valore
  rivelato}."
  Esempio (dallo spec): "Roberto pesca dal mazzo, scarta un sette. Scopre
  riga due colonna uno: era coperta, ora è un quattro."
- **Essenziale**: "{nome} scarta un {valore scartato} e scopre riga {riga}
  colonna {colonna}: un {valore rivelato}."
  Esempio: "Roberto scarta un sette e scopre riga due colonna uno: un
  quattro."
  *(Non c'era un esempio esplicito nello spec originale per questo caso:
  frase completata per coerenza con lo stile essenziale già definito per la
  sostituzione, punto 3.2.)*

### 3.2 Turno avversario — sostituzione (da mazzo coperto o dagli scarti)

- **Dettagliata**: "{nome} pesca dal mazzo, tiene un {valore nuovo}" oppure
  "{nome} prende dagli scarti un {valore nuovo}", poi ", sostituisce riga
  {riga} colonna {colonna}. " seguito da:
  - se la posizione era già scoperta: "Lì c'era un {valore precedente}, ora
    scartato."
  - se la posizione era coperta: "Era coperta, ora scartata."
  Esempio (dallo spec): "Elena prende dagli scarti un cinque, sostituisce
  riga due colonna uno. Lì c'era un nove, ora scartato."
- **Essenziale**: "{nome} scambia riga {riga} colonna {colonna} con un
  {valore nuovo}."
  Esempio (dallo spec): "Roberto scambia riga due colonna uno con un tre."

### 3.3 Colonna completata e annullata

Suono speciale, poi sempre "Motto Gioooooo!", poi:

- Avversario: "{nome} completa la colonna {colonna}, annullata."
- Giocatore umano: "Completi la colonna {colonna}, annullata."

### 3.4 Chiusura della manche

- Avversario: "{nome} scopre l'ultima carta, ultimo turno per tutti gli
  altri."
- Giocatore umano: "Scopri l'ultima carta, ultimo turno per tutti gli
  altri."

### 3.5 Passaggio di mano al giocatore umano

Suono, poi "Tocca a te.", poi silenzio. Riguarda sempre e solo il giocatore
umano per definizione (non serve mai il nome).

### 3.6 Punteggio a richiesta (pulsante "somma punti", non automatico)

- Deck di un avversario: "Punti dalle carte scoperte, {nome}: totale
  {somma} punti."
- Proprio Deck: "Punti dalle tue carte scoperte: totale {somma} punti."

(La parola "punti" dopo il numero è stata aggiunta dopo che l'utente ha
segnalato che sentire solo il numero nudo, senza l'unità di misura, non
era chiaro.)

### 3.7 Cambio Deck in ascolto (punto 5)

- Avversario: "Ora ascolti Deck di {nome}."
- Proprio: "Ora ascolti il tuo Deck."

### 3.8 Lettura di una posizione (esplorazione tattile, punto 5)

"Riga {riga} colonna {colonna}: {valore}." oppure, se coperta: "Riga {riga}
colonna {colonna}: coperta."

### 3.9 Lettura di una riga o di una colonna (punto 5)

Nessun esempio esplicito nello spec originale: frasi completate per coerenza
con la convenzione "riga prima, colonna dopo" già fissata.

- Riga: "Riga {riga}: colonna {1}, {valore o coperta}, colonna {2}, {valore o
  coperta}, ... colonna {N}, {valore o coperta}."
  Esempio: "Riga due: colonna uno, sette, colonna due, coperta, colonna tre,
  quattro, colonna quattro, dieci."
- Colonna: stessa struttura, invertendo riga/colonna.
  Esempio: "Colonna due: riga uno, sette, riga due, coperta, riga tre,
  quattro."

### 3.10 Lettura dell'intero Deck in ascolto, riga per riga (punto 5)

Intestazione ("Deck di {nome}." o "Il tuo Deck.") seguita dalla lettura di
ogni riga (punto 3.9) in sequenza, dalla prima all'ultima.

### 3.11 Chi inizia la manche, con quanti punti scoperti

Dopo che tutti (avversari virtuali in automatico, giocatore umano coi
propri due clic) hanno scoperto le due carte iniziali, il narratore annuncia
chi gioca per primo e la somma delle sue due carte appena scoperte — senza,
chi non usa VoiceOver non aveva alcun modo di sapere che la manche era
davvero iniziata né chi tocca per primo (bug segnalato dall'utente).

- Avversario: "Inizia {nome}, con {somma} punti."
- Giocatore umano: "Inizi tu, con {somma} punti." (mai il nome, regola
  trasversale)

Riusa lo stesso frammento `parola_punti` di 3.6. Nella prima manche la somma
è quella dei due valori scoperti (che determina anche chi parte, per
regola); nelle manche successive chi parte è sempre chi ha chiuso la manche
precedente (invariato), ma la frase annuncia comunque i punti delle due
carte appena scoperte in questa manche, non il punteggio della manche
precedente — è l'informazione disponibile nello stesso istante in cui la
fase di gioco comincia davvero.

### 3.12 Regola anti-imbroglio (punto 5)

Le funzioni di lettura (3.7-3.10) accettano solo la vista pubblica del Deck
(`PublicGrid`, la stessa usata dai profili IA — sezione vista in
`src/ai/view.ts`): una carta ancora coperta non porta con sé nessun valore a
livello di tipo, quindi non può mai trapelare per errore, né per il proprio
Deck né per quello di un avversario.
