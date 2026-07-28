// main.js — bootstrap: shell de tabs, service worker, seed inicial.
// Gym Tracker es una app de UN solo módulo: no hay home ni registry (la
// arquitectura de módulos de habitos-app era overhead sin uso aquí).

import { el, clear, toast, guard } from './dom.js';
import { dbGetAll, prefGet, prefSet, dbBulkImport } from './db.js';
import { normalizeBackup } from './importer.js';
import { installAudioUnlock } from './audio.js';
import { renderEntrenar } from './ui/entrenar.js';
import { renderEjercicios } from './ui/ejercicios.js';
import { renderProgresion } from './ui/progresion.js';
import { sheet, confirmRow } from './ui/modals.js';

const TABS = [
  { id: 'entrenar', label: 'Entrenar', render: renderEntrenar },
  { id: 'ejercicios', label: 'Ejercicios', render: renderEjercicios },
  { id: 'progresion', label: 'Progresión', render: renderProgresion }
];

function boot() {
  installAudioUnlock();
  const root = document.getElementById('app');
  clear(root);
  root.appendChild(el('h1', { class: 'g-screen-title' }, ['Gym Tracker']));

  const tabBar = el('div', { class: 'main-tabs' });
  const content = el('div', {});
  root.appendChild(tabBar);
  root.appendChild(content);

  const panels = {};
  TABS.forEach((tab, i) => {
    const btn = el('button', {
      class: 'main-tab' + (i === 0 ? ' active' : ''),
      id: 'tab-btn-' + tab.id, type: 'button'
    }, [tab.label]);
    btn.addEventListener('click', () => switchTab(tab.id, panels));
    tabBar.appendChild(btn);
    const panel = el('div', { class: 'tab-panel' + (i === 0 ? ' active' : ''), id: 'panel-' + tab.id });
    panels[tab.id] = panel;
    content.appendChild(panel);
  });

  TABS.forEach((tab) => tab.render(panels[tab.id]));
  registerSW();
  maybeOfferSeed(panels);
}

function switchTab(activeId, panels) {
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
// La app vieja tenía el listener SKIP_WAITING pero nada lo enviaba: había que
// matar la PWA a mano para actualizar. Aquí hay banner explícito.
function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('./sw.js').then((reg) => {
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      if (!nw) return;
      nw.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) {
          showUpdateBanner(nw);
        }
      });
    });
  }).catch(() => {});

  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded) return;
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

document.addEventListener('DOMContentLoaded', boot);
