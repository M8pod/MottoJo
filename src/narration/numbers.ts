/**
 * Numeri generici in parole italiane, per i punteggi ("somma punti"): a
 * differenza dei valori di carta (-2..12, tabella fissa in fragments.ts), un
 * totale può essere qualunque intero (somma di un Deck, punteggio di
 * partita fino a 100+). Servono quindi composti secondo la grammatica
 * italiana standard, non un'unica tabella chiusa — vedi
 * `motto-jo-frasi-narrazione.md`, sezione 1.4, per l'intervallo pratico da
 * pre-registrare come parole intere (mai spezzate in fonemi).
 */

const UNITS = ["zero", "uno", "due", "tre", "quattro", "cinque", "sei", "sette", "otto", "nove"];
const TEENS = [
  "dieci",
  "undici",
  "dodici",
  "tredici",
  "quattordici",
  "quindici",
  "sedici",
  "diciassette",
  "diciotto",
  "diciannove",
];
const TENS = ["venti", "trenta", "quaranta", "cinquanta", "sessanta", "settanta", "ottanta", "novanta"];

function wordsBelowThousand(n: number): string {
  if (n < 10) return UNITS[n]!;
  if (n < 20) return TEENS[n - 10]!;
  if (n < 100) {
    const tensWord = TENS[Math.floor(n / 10) - 2]!;
    const unit = n % 10;
    if (unit === 0) return tensWord;
    if (unit === 1 || unit === 8) return tensWord.slice(0, -1) + UNITS[unit];
    if (unit === 3) return `${tensWord}tré`;
    return tensWord + UNITS[unit];
  }
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const hundredWord = hundreds === 1 ? "cento" : `${UNITS[hundreds]}cento`;
  return rest === 0 ? hundredWord : hundredWord + wordsBelowThousand(rest);
}

export function numberToWords(n: number): string {
  if (n === 0) return "zero";
  if (n < 0) return `meno ${numberToWords(-n)}`;
  if (!Number.isInteger(n) || n >= 1000) {
    throw new Error(`Numero non pronunciabile: ${n}`);
  }
  return wordsBelowThousand(n);
}
