/* Service worker de Órdenes de mantenimiento — Bacao
   Estrategia: la red manda, el caché es el respaldo.
   Así una versión nueva llega sola en cuanto hay señal, y si no hay señal
   la aplicación abre igual con la última copia descargada.               */
const VERSION = "bacao-v2";
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

/* ---------- avisos ----------
   El aviso llega sin contenido: aquí se consulta el último y se muestra. */
const SERVICIO = "https://ordenes-bacao.mgereda.workers.dev";
const CLAVE = "2MWpGyZcdUQqMTSgiHXAo5gx";

self.addEventListener("push", (e) => {
  e.waitUntil((async () => {
    let titulo = "Mantenimiento", cuerpo = "Tienes una novedad", url = "./index.html";
    try {
      const r = await fetch(SERVICIO + "/avisos?k=" + encodeURIComponent(CLAVE));
      const d = await r.json();
      if (d.avisos && d.avisos.length) {
        titulo = d.avisos[0].titulo;
        cuerpo = d.avisos[0].cuerpo;
        url = d.avisos[0].url || url;
      }
    } catch (err) { /* sin datos: se muestra el aviso genérico */ }
    await self.registration.showNotification(titulo, {
      body: cuerpo,
      icon: "./iconos/icono-192.png",
      badge: "./iconos/icono-192.png",
      tag: "mantenimiento",
      data: { url },
    });
  })());
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const destino = (e.notification.data && e.notification.data.url) || "./index.html";
  e.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((lista) => {
    for (const c of lista) if ("focus" in c) return c.focus();
    return clients.openWindow(destino);
  }));
});
