/* Service worker de Órdenes de mantenimiento — Bacao
   Estrategia: la red manda, el caché es el respaldo.
   Así una versión nueva llega sola en cuanto hay señal, y si no hay señal
   la aplicación abre igual con la última copia descargada.               */
const VERSION = "bacao-v1";
const BASICOS = ["./index.html", "./panel.html", "./tablero.html",
                 "./manifest.json", "./iconos/icono-192.png", "./iconos/icono-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(BASICOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;                 // los envíos nunca se cachean
  if (url.hostname.includes("workers.dev")) return;       // el servicio siempre en vivo

  e.respondWith(
    fetch(e.request)
      .then((resp) => {
        const copia = resp.clone();
        caches.open(VERSION).then((c) => c.put(e.request, copia)).catch(() => {});
        return resp;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match("./index.html")))
  );
});
