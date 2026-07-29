// Service Worker — Gym Tracker
// Bumpear CACHE en cada deploy (formato gymtracker-YYYYMMDD-N).
// Archivos nuevos → agregarlos a ASSETS. Ver README §Deploy.
var CACHE = "gymtracker-" + "20260729-1";
var ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./manifest.json",
  "./js/main.js",
  "./js/db.js",
  "./js/dom.js",
  "./js/format.js",
  "./js/stats.js",
  "./js/importer.js",
  "./js/audio.js",
  "./js/wakelock.js",
  "./js/resttimer.js",
  "./js/ui/icons.js",
  "./js/ui/modals.js",
  "./js/ui/entrenar.js",
  "./js/ui/ejercicios.js",
  "./js/ui/progresion.js",
  "./icons/icon-180.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-512-maskable.png",
  "./data/seed.json"
];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (cache) { return cache.addAll(ASSETS); }));
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
});
