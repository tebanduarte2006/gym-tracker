// swupdate.js — registro del service worker, detección y aplicación de nuevas
// versiones. Vive aparte de main.js porque el tab Progresión necesita
// swVersion()/forceUpdateCheck() y main.js ya importa Progresión: juntarlos
// crearía un import circular.

import { el } from './dom.js';
import { dbGetAll } from './db.js';

// Versión de la app que este JS cree ser. Debe coincidir con CACHE en sw.js.
// Se muestra en Progresión → DATOS junto a la que sirve el SW de verdad.
export const APP_VERSION = '20260802-2';

// ─── Service Worker + banner de actualización ─────────────────────────────────
// Objetivo: que Esteban NUNCA tenga que desinstalar y reinstalar la PWA para
// ver un cambio. Cuatro piezas, y las cuatro hacen falta:
//   1. updateViaCache:'none' → el navegador no puede servir un sw.js viejo
//      desde su caché HTTP (GitHub Pages manda max-age).
//   2. reg.waiting al arrancar → si en la sesión anterior quedó una versión
//      instalada esperando y él no tocó "Actualizar", el banner reaparece.
//      Sin esto la actualización se quedaba trabada para siempre.
//   3. reg.update() al abrir y al volver del background → una PWA que se queda
//      abierta días detecta la versión nueva sin reiniciarse.
//   4. La recarga por controllerchange SOLO si ya había un controller: en la
//      primerísima instalación, clients.claim() disparaba una recarga completa
//      e inútil que alargaba el arranque en frío.
//   5. Un worker en `waiting` al arrancar se ACTIVA SOLO si no hay sesión de
//      gym a medias. El banner es un buen aviso, pero depender de que el
//      usuario lo vea y lo toque es frágil: si no lo ve, se queda en la
//      versión vieja sin enterarse. Entrenando sí se pregunta (una recarga en
//      mitad de una serie es peor que esperar).
//   6. Botón manual "Buscar actualización" + versión visible en Progresión →
//      DATOS. Sin eso no hay forma de saber qué versión estás corriendo, que
//      es exactamente lo que hace imposible diagnosticar "no se actualizó".
const UPDATE_CHECK_MS = 60 * 1000;
let _lastUpdateCheck = 0;
let _reg = null;

export function registerSW() {
  if (!('serviceWorker' in navigator)) return;

  const hadController = !!navigator.serviceWorker.controller;

  navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then((reg) => {
    _reg = reg;

    // Un worker puede estar YA instalado (waiting) o instalándose (installing)
    // cuando register() resuelve: en ese caso `updatefound` ya se disparó y
    // engancharlo ahora no sirve de nada. Hay que mirar los tres estados.
    const track = (worker) => {
      if (!worker || !hadController) return;
      if (worker.state === 'installed') { onNewVersionReady(worker); return; }
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed') onNewVersionReady(worker);
      });
    };
    track(reg.waiting);
    track(reg.installing);
    reg.addEventListener('updatefound', () => track(reg.installing));

    checkForUpdate();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') checkForUpdate();
    });
  }).catch(() => {});

  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloaded) return;
    reloaded = true;
    window.location.reload();
  });
}

function checkForUpdate(force) {
  if (!_reg) return Promise.resolve(false);
  const now = Date.now();
  if (!force && now - _lastUpdateCheck < UPDATE_CHECK_MS) return Promise.resolve(false);
  _lastUpdateCheck = now;
  return _reg.update().then(() => !!(_reg.waiting || _reg.installing)).catch(() => false);
}

// Hay versión nueva lista. Si no está entrenando, se aplica sola; si está en
// mitad de una sesión, se le pregunta con el banner.
function onNewVersionReady(worker) {
  dbGetAll('sesiones')
    .then((sesiones) => sesiones.some((s) => s.finalizada !== true))
    .catch(() => true) // ante la duda, preguntar en vez de recargar
    .then((entrenando) => {
      if (entrenando) showUpdateBanner(worker);
      else worker.postMessage('SKIP_WAITING'); // controllerchange recarga
    });
}

// Versión que está sirviendo REALMENTE el service worker (su constante CACHE),
// no la que este JS cree tener. Si divergen, algo está mal.
export function swVersion() {
  const sw = navigator.serviceWorker && navigator.serviceWorker.controller;
  if (!sw) return Promise.resolve(null);
  return new Promise((resolve) => {
    const ch = new MessageChannel();
    const timer = setTimeout(() => resolve(null), 1500);
    ch.port1.onmessage = (e) => { clearTimeout(timer); resolve(e.data); };
    sw.postMessage('VERSION', [ch.port2]);
  });
}

// La usa el botón "Buscar actualización" del tab Progresión.
export function forceUpdateCheck() {
  if (!_reg) return Promise.resolve('sin-sw');
  return checkForUpdate(true).then(() => {
    const w = _reg.waiting;
    if (w) { w.postMessage('SKIP_WAITING'); return 'actualizando'; }
    return 'al-dia';
  });
}

function showUpdateBanner(worker) {
  if (document.querySelector('.update-banner')) return;
  const btn = el('button', { class: 'update-banner-btn', type: 'button' }, ['Actualizar']);
  const banner = el('div', { class: 'update-banner' }, [
    el('span', {}, ['Nueva versión disponible']),
    btn
  ]);
  btn.addEventListener('click', () => {
    worker.postMessage('SKIP_WAITING');
    banner.remove();
  });
  document.body.appendChild(banner);
}
