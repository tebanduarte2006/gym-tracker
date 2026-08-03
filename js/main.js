// main.js — bootstrap: shell de tabs, service worker, seed inicial.
// Gym Tracker es una app de UN solo módulo: no hay home ni registry (la
// arquitectura de módulos de habitos-app era overhead sin uso aquí).

import { el, clear, toast, guard } from './dom.js';
import { dbGetAll, prefGet, prefSet, dbBulkImport } from './db.js';
import { normalizeBackup } from './importer.js';
import { installAudioUnlock } from './audio.js';
import { renderEntrenar, suspendEntrenar } from './ui/entrenar.js';
import { renderEjercicios } from './ui/ejercicios.js';
import { renderProgresion } from './ui/progresion.js';
import { sheet, confirmRow } from './ui/modals.js';

const TABS = [
  { id: 'entrenar', label: 'Entrenar', render: renderEntrenar },
  { id: 'ejercicios', label: 'Ejercicios', render: renderEjercicios },
  { id: 'progresion', label: 'Progresión', render: renderProgresion }
];

// El título y la barra de tabs viven ESTÁTICOS en index.html a propósito: son
// lo único que iOS puede pintar antes de descargar y ejecutar los módulos, y
// sin ellos el arranque en frío de la PWA era una pantalla negra de segundos.
// No los muevas de vuelta a JS "por limpieza" — ver README §Arranque.
function boot() {
  installAudioUnlock();
  const content = document.getElementById('tab-content');
  clear(content); // quita el esqueleto estático de arranque

  const panels = {};
  TABS.forEach((tab, i) => {
    const btn = document.getElementById('tab-btn-' + tab.id);
    if (btn) btn.addEventListener('click', () => switchTab(tab.id, panels));
    const panel = el('div', { class: 'tab-panel' + (i === 0 ? ' active' : ''), id: 'panel-' + tab.id });
    panels[tab.id] = panel;
    content.appendChild(panel);
  });

  // Un fallo pintando UN tab no puede tumbar el arranque: sin este try/catch,
  // una excepción aquí abortaba el forEach y dejaba la app sin service worker
  // (adiós actualizaciones) y sin la oferta de restaurar el historial.
  TABS.forEach((tab) => {
    try {
      tab.render(panels[tab.id]);
    } catch (err) {
      console.error('[gym-tracker] render del tab', tab.id, err);
      clear(panels[tab.id]);
      panels[tab.id].appendChild(el('div', { class: 'g-empty-card' }, [
        'Esta pestaña falló al cargar. Cierra y vuelve a abrir la app.'
      ]));
    }
  });
  registerSW();
  maybeOfferSeed(panels);
}

function switchTab(activeId, panels) {
  // El tab que se va deja de consumir CPU: su cronómetro de sesión seguía
  // latiendo 1×/s en segundo plano mientras mirabas otra pestaña.
  if (activeId !== 'entrenar') suspendEntrenar();
  TABS.forEach((tab) => {
    const btn = document.getElementById('tab-btn-' + tab.id);
    const isActive = tab.id === activeId;
    if (btn) btn.classList.toggle('active', isActive);
    panels[tab.id].classList.toggle('active', isActive);
  });
  const tab = TABS.find((t) => t.id === activeId);
  tab.render(panels[activeId]);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── Seed inicial (historial de habitos-app) ──────────────────────────────────
// Primera apertura con DB vacía: ofrece restaurar data/seed.json (el backup
// del 2026-07-28 con las 35 sesiones históricas). Decisión persistida.
function maybeOfferSeed(panels) {
  guard(Promise.all([dbGetAll('sesiones'), prefGet('seed_decidido', false)]), 'verificando seed')
    .then(([sesiones, decidido]) => {
      if (sesiones.length > 0 || decidido) return;
      fetch('./data/seed.json')
        .then((r) => (r.ok ? r.json() : null))
        .then((raw) => {
          if (!raw) return;
          let norm;
          try { norm = normalizeBackup(raw); } catch { return; }
          const s = sheet('Restaurar historial');
          s.modal.appendChild(el('div', { class: 'g-modal-body' }, [
            'Encontré tu historial de la app anterior (hasta el 26 jun 2026). ¿Lo cargo?'
          ]));
          s.modal.appendChild(el('div', { class: 'g-confirm-summary' }, [
            confirmRow('Sesiones', String(norm.sesiones.length)),
            confirmRow('Ejercicios', String(norm.ejercicios.length)),
            confirmRow('Sets', String(norm.sets.length))
          ]));
          const ok = el('button', { class: 'g-btn-primary', type: 'button' }, ['Restaurar historial']);
          ok.addEventListener('click', () => {
            s.close();
            guard(dbBulkImport(norm).then(() => prefSet('seed_decidido', true)), 'restaurando historial')
              .then(() => {
                toast('Historial restaurado 💪');
                renderEntrenar(panels.entrenar);
              });
          });
          const skip = el('button', { class: 'g-btn-secondary', type: 'button' }, ['Empezar de cero']);
          skip.addEventListener('click', () => {
            prefSet('seed_decidido', true);
            s.close();
          });
          s.modal.appendChild(ok);
          s.modal.appendChild(skip);
          s.open();
        })
        .catch(() => {});
    });
}

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
const UPDATE_CHECK_MS = 60 * 1000;
let _lastUpdateCheck = 0;

function registerSW() {
  if (!('serviceWorker' in navigator)) return;

  const hadController = !!navigator.serviceWorker.controller;

  navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then((reg) => {
    if (reg.waiting && hadController) showUpdateBanner(reg.waiting);

    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      if (!nw) return;
      nw.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) {
          showUpdateBanner(nw);
        }
      });
    });

    const checkForUpdate = () => {
      const now = Date.now();
      if (now - _lastUpdateCheck < UPDATE_CHECK_MS) return;
      _lastUpdateCheck = now;
      reg.update().catch(() => {});
    };
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

// `guard()` re-lanza el error después de avisar por toast, así que casi todas
// las cadenas terminan en una promesa rechazada sin catch. Eso es correcto
// (el usuario ya vio el aviso), pero llenaba la consola de "Unhandled promise
// rejection" y enterraba los errores de verdad al depurar.
window.addEventListener('unhandledrejection', (e) => {
  if (e.reason && e.reason._gymHandled) e.preventDefault();
});

// Los módulos ES son diferidos: si el DOM ya está listo cuando este archivo
// termina de evaluarse, DOMContentLoaded no vuelve a dispararse.
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
