// Service Worker — Gym Tracker
// Bumpear CACHE en cada deploy (formato gymtracker-YYYYMMDD-N).
// Archivos nuevos → agregarlos a ASSETS. Ver README §Deploy.
var CACHE = "gymtracker-" + "20260813-1";
var ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./manifest.json",
  "./js/main.js",
  "./js/swupdate.js",
  "./js/db.js",
  "./js/dom.js",
  "./js/format.js",
  "./js/stats.js",
  "./js/plates.js",
  "./js/muscles.js",
  "./js/importer.js",
  "./js/audio.js",
  "./js/wakelock.js",
  "./js/resttimer.js",
  "./js/ui/icons.js",
  "./js/ui/dragorder.js",
  "./js/ui/modals.js",
  "./js/ui/entrenar.js",
  "./js/ui/ejercicios.js",
  "./js/ui/progresion.js",
  "./icons/icon-180.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-512-maskable.png",
  "./icons/splash-828x1792.png",
  "./icons/splash-1125x2436.png",
  "./icons/splash-1170x2532.png",
  "./icons/splash-1179x2556.png",
  "./icons/splash-1242x2688.png",
  "./data/seed.json"
];

// El shell mínimo se cachea de forma atómica (sin él la app no arranca offline).
// El resto va uno por uno y sin abortar: con addAll(ASSETS) completo, UN solo
// 404 (un splash renombrado, un módulo nuevo mal escrito en la lista) tumbaba
// la instalación entera y la PWA se quedaba clavada en la versión vieja sin
// decir nada.
var CORE = ["./", "./index.html", "./styles.css", "./js/main.js"];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(CORE).then(function () {
        return Promise.all(ASSETS.map(function (url) {
          return cache.add(url).catch(function (err) {
            console.warn("[sw] no se pudo cachear", url, err);
          });
        }));
      });
    })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(function (r) {
      if (r) return r;
      return fetch(e.request).catch(function () {
        // Fallback de navegación offline: el shell.
        if (e.request.mode === "navigate") return caches.match("./index.html");
        throw new Error("offline");
      });
    })
  );
});

self.addEventListener("message", function (e) {
  if (e.data === "SKIP_WAITING") self.skipWaiting();
  // La app pregunta qué versión se está sirviendo de verdad, para mostrarla en
  // Progresión → DATOS. Sin esto era imposible saber si una actualización entró.
  if (e.data === "VERSION" && e.ports && e.ports[0]) e.ports[0].postMessage(CACHE);
});
