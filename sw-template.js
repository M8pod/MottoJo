// Service worker di Motto Jo: rende il gioco installabile e giocabile offline.
// Questo è il MODELLO: `vite build` (plugin in vite.config.ts) lo copia in
// dist/sw.js sostituendo __VERSION__, __CORE__ e __REST__ con la versione e
// l'elenco reale dei file pubblicati.
//
// - All'installazione salva subito il "nucleo" (pagina, codice, stile, icone)
//   e poi, in sottofondo, tutto il resto (audio e immagini): dopo la prima
//   apertura con internet il gioco funziona anche senza connessione.
// - Le richieste audio con intestazione Range (Safari su iPhone/iPad) ricevono
//   una risposta 206 con il pezzo richiesto: senza, l'audio da cache non parte.

const VERSION = "__VERSION__";
const CACHE = `motto-jo-${VERSION}`;
const CORE = __CORE__;
const REST = __REST__;

const scopeUrl = (path) => new URL(path, self.registration.scope).toString();

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(CORE.map(scopeUrl)))
      .then(() => self.skipWaiting()),
  );
});

async function fillRest() {
  const cache = await caches.open(CACHE);
  for (const path of REST) {
    const url = scopeUrl(path);
    try {
      if (!(await cache.match(url))) {
        const res = await fetch(url);
        if (res.ok) await cache.put(url, res);
      }
    } catch (e) {
      // Nessuna connessione: si riprova alla prossima attivazione.
    }
  }
}

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("motto-jo-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
  // Audio e immagini in sottofondo, senza bloccare l'avvio del gioco.
  fillRest();
});

async function rangeResponse(request, response) {
  const header = request.headers.get("range");
  const match = /bytes=(\d*)-(\d*)/.exec(header || "");
  const blob = await response.blob();
  if (!match) return new Response(blob, { status: 200, headers: response.headers });
  const size = blob.size;
  let start = match[1] === "" ? NaN : Number(match[1]);
  let end = match[2] === "" ? NaN : Number(match[2]);
  if (isNaN(start)) { start = Math.max(0, size - end); end = size - 1; }
  if (isNaN(end) || end >= size) end = size - 1;
  if (start >= size || start > end) {
    return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
  }
  const headers = new Headers(response.headers);
  headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
  headers.set("Content-Length", String(end - start + 1));
  headers.set("Accept-Ranges", "bytes");
  return new Response(blob.slice(start, end + 1), { status: 206, statusText: "Partial Content", headers });
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Pagina: prima la rete (per ricevere gli aggiornamenti), poi la copia salvata.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(scopeUrl("./"), copy));
          return res;
        })
        .catch(() => caches.match(scopeUrl("./"))),
    );
    return;
  }

  // Tutto il resto: prima la copia salvata, poi la rete (salvando il file).
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cacheKey = url.origin + url.pathname;
      let cached = await cache.match(cacheKey);
      if (!cached) {
        try {
          // Senza Range, così in cache finisce sempre il file intero.
          const res = await fetch(cacheKey);
          if (res.ok && res.status === 200) {
            await cache.put(cacheKey, res.clone());
            cached = res;
          } else {
            return res;
          }
        } catch (e) {
          return Response.error();
        }
      }
      return request.headers.has("range") ? rangeResponse(request, cached.clone()) : cached;
    })(),
  );
});
