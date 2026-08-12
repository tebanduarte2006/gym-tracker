// swupdate.js — registro del service worker, detección y aplicación de nuevas
// versiones. Vive aparte de main.js porque el tab Progresión necesita
// swVersion()/forceUpdateCheck() y main.js ya importa Progresión: juntarlos
// crearía un import circular.

import { el } from './dom.js';
import { dbGetAll } from './db.js';

// Versión de la app que este JS cree ser. Debe coincidir con CACHE en sw.js.
// Se muestra en Progresión → DATOS junto a la que sirve el SW de verdad.
export const APP_VERSION = '20260812-2';

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

  // MUTABLE a propósito. Antes era `const` leído una sola vez al arrancar y
  // esa foto congelada dejaba sorda para siempre a la pestaña abierta desde la
  // primerísima instalación: al llegar una versión nueva se aplicaba
  // (SKIP_WAITING) pero `controllerchange` veía `false` y NO recargaba, así que
  // la pantalla seguía corriendo el JS viejo en memoria sin decir nada. Es el
  // mismo error que la lección #18 del README, en la otra mitad del mecanismo.
  let hadController = !!navigator.serviceWorker.controller;

  navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then((reg) => {
    _reg = reg;

    // Un worker puede estar YA instalado (waiting) o instalándose (installing)
    // cuando register() resuelve: en ese caso `updatefound` ya se disparó y
    // engancharlo ahora no sirve de nada. Hay que mirar los tres estados.
    const track = (worker) => {
      if (!worker) return;
      const listo = () => {
        // Se consulta el controller AHORA, no el `hadController` del arranque:
        // si la app se abrió por primera vez (sin controller) y se queda
        // abierta, al instalarse el SW ya hay controller y una versión
        // posterior sí debe avisar. Con el valor congelado del arranque esa
        // pestaña se quedaba sorda el resto de su vida.
        if (!navigator.serviceWorker.controller) return; // primera instalación
        onNewVersionReady(worker);
      };
      if (worker.state === 'installed') { listo(); return; }
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed') listo();
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
    // Primera vez que un worker toma control (clients.claim() de la instalación
    // inicial): NO se recarga — esa recarga espuria duplicaba el arranque en
    // frío. Pero sí se anota que a partir de ahora YA hay controller, para que
    // el siguiente cambio (una versión nueva de verdad) sí recargue.
    if (!hadController) { hadController = true; return; }
    if (reloaded) return;
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

// Espera a que un worker que está `installing` salga de ese estado.
// `_reg.update()` puede resolver con la versión nueva TODAVÍA instalándose: en
// ese instante `_reg.waiting` aún es null y el botón manual contestaba "Ya
// tienes la última versión" — una mentira dicha justo en la pantalla que existe
// para diagnosticar "no se actualizó". Con timeout: si la instalación se cuelga,
// se responde igual en vez de dejar el botón bloqueado.
function waitForInstalled(worker, timeoutMs) {
  if (!worker || worker.state !== 'installing') return Promise.resolve();
  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      worker.removeEventListener('statechange', onState);
      resolve();
    };
    const onState = () => { if (worker.state !== 'installing') finish(); };
    const timer = setTimeout(finish, timeoutMs);
    worker.addEventListener('statechange', onState);
  });
}

// La usa el botón "Buscar actualización" del tab Progresión.
export function forceUpdateCheck() {
  if (!_reg) return Promise.resolve('sin-sw');
  return checkForUpdate(true)
    .then(() => waitForInstalled(_reg.installing, 10000))
    .then(() => {
      const w = _reg.waiting;
      if (w) { w.postMessage('SKIP_WAITING'); return 'actualizando'; }
      return 'al-dia';
    });
}

function showUpdateBanner(worker) {
  if (document.querySelector('.update-banner')) return;
  const btn = el('button', { class: 'update-banner-btn', type: 'button' }, ['Actualizar']);
  const banner = el('div', { class: 'update-banner' }, [
    el('span', {}, ['✨ Nueva versión lista']),
    btn
  ]);
  btn.addEventListener('click', () => {
    // No se quita el banner: se deja en "Actualizando…" hasta que
    // controllerchange recargue la página. Quitarlo de inmediato daba la
    // sensación de que no había pasado nada.
    btn.disabled = true;
    btn.textContent = 'Actualizando…';
    // Se lee `_reg.waiting` EN EL MOMENTO DEL CLIC, no el worker capturado al
    // crear el banner: si entre medias apareció otro worker, el capturado
    // quedó `redundant` y su postMessage no hace absolutamente nada — el
    // botón se veía pulsado y no pasaba nada. Reproducido en Chrome.
    const actual = (_reg && _reg.waiting) || worker;
    actual.postMessage('SKIP_WAITING');
    // Red de seguridad: si en 6 s no hubo recarga (el worker estaba muerto o
    // el mensaje se perdió), se recarga a mano en vez de dejarlo colgado.
    setTimeout(() => {
      if (document.body.contains(banner)) window.location.reload();
    }, 6000);
  });
  document.body.appendChild(banner);
  // El banner es `fixed` y tapa el título: se empuja el contenido mientras esté
  // visible para que nada quede inalcanzable debajo.
  document.body.classList.add('g-update-open');
}
