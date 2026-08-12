// main.js — bootstrap: shell de tabs, service worker, seed inicial.
// Gym Tracker es una app de UN solo módulo: no hay home ni registry (la
// arquitectura de módulos de habitos-app era overhead sin uso aquí).

import { el, clear, toast, guard } from './dom.js';
import { dbGetAll, dbPut, prefGet, prefSet, dbBulkImport } from './db.js';
import { registerSW } from './swupdate.js';
import { normalizeBackup } from './importer.js';
import { installAudioUnlock } from './audio.js';
import { renderEntrenar, suspendEntrenar } from './ui/entrenar.js';
import { renderEjercicios } from './ui/ejercicios.js';
import { renderProgresion } from './ui/progresion.js';
import { sheet, confirmRow, once } from './ui/modals.js';
import { planMuscleMigration } from './muscles.js';

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

  // SOLO se pinta el tab visible. Antes se pintaban los tres al arrancar: nueve
  // lecturas completas de IndexedDB (sesiones, sets, ejercicios, cardio…) antes
  // de que se viera nada, en un iPhone 11 y encima del arranque en frío que ya
  // costó tres arreglos (ver README §Arranque). Ejercicios y Progresión se
  // pintan solos al tocarlos: `switchTab` ya re-renderiza en CADA cambio de
  // pestaña, así que no hay nada que precalentar.
  paintTab(TABS[0], panels[TABS[0].id]);
  registerSW();
  maybeOfferSeed(panels);
  maybeOfferMuscleMigration();
}

// ─── Migración de la taxonomía de músculos ────────────────────────────────────
// La lista vieja mezclaba regiones con músculos ('Espalda' junto a 'Dorsales') y
// tenía nombres en singular y plural a la vez ('Aductor' / 'Aductores'), así que
// el selector mostraba duplicados y el volumen por músculo contaba dos veces el
// mismo set. Ver js/muscles.js.
//
// Se OFRECE, no se aplica sola: reescribe el etiquetado de todo su historial y
// eso es suyo, no mío. Se enseña ejercicio por ejercicio lo que cambia; si dice
// que no, se recuerda y no se vuelve a preguntar.
function maybeOfferMuscleMigration() {
  guard(Promise.all([dbGetAll('ejercicios'), prefGet('musculos_migrados', false)]), 'revisando músculos')
    .then(([ejercicios, yaDecidido]) => {
      if (yaDecidido || ejercicios.length === 0) return;
      const plan = planMuscleMigration(ejercicios);
      if (plan.length === 0) { prefSet('musculos_migrados', true); return; }

      const s = sheet('Lista de músculos nueva');
      s.modal.appendChild(el('div', { class: 'g-modal-body' }, [
        'Unifiqué los músculos en una lista de 18, sin regiones que se solapen ' +
        '(antes "Espalda" y "Dorsales" contaban el mismo set dos veces) y sin ' +
        'nombres duplicados en singular y plural. Esto ajusta ' + plan.length +
        (plan.length === 1 ? ' ejercicio:' : ' ejercicios:')
      ]));

      const card = el('div', { class: 'g-list-card' });
      plan.forEach((p) => {
        card.appendChild(el('div', { class: 'g-list-row', style: 'cursor:default;' }, [
          el('div', {}, [
            el('div', { class: 'g-list-name' }, [p.nombre]),
            el('div', { class: 'g-list-sub' }, [
              (p.antes.join(' · ') || 'sin músculo') + '  →  ' +
              (p.despues.join(' · ') || '⚠️ sin resolver')
            ])
          ])
        ]));
      });
      s.modal.appendChild(card);

      const sinResolver = plan.filter((p) => p.sinResolver.length > 0);
      if (sinResolver.length > 0) {
        s.modal.appendChild(el('div', { class: 'g-confirm-warn' }, [
          sinResolver.length + (sinResolver.length === 1 ? ' ejercicio tiene' : ' ejercicios tienen') +
          ' músculos que no puedo traducir sin adivinar. Los dejo como están para que los ' +
          'ajustes tú desde su ficha.'
        ]));
      }

      const ok = el('button', { class: 'g-btn-primary', type: 'button' }, ['Aplicar']);
      once(ok, () => {
        const jobs = plan
          .filter((p) => p.despues.length > 0)
          .map((p) => {
            const ej = ejercicios.find((e) => e.id === p.id);
            ej.musculos = p.despues;
            return dbPut('ejercicios', ej);
          });
        return guard(Promise.all(jobs).then(() => prefSet('musculos_migrados', true)), 'migrando músculos')
          .then(() => {
            s.close();
            toast(jobs.length + ' ejercicios actualizados');
          });
      });
      const no = el('button', { class: 'g-btn-secondary', type: 'button' }, ['Dejarlo como está']);
      no.addEventListener('click', () => {
        prefSet('musculos_migrados', true);
        s.close();
      });
      s.modal.appendChild(ok);
      s.modal.appendChild(no);
      s.open();
    })
    .catch(() => {}); // nunca puede tumbar el arranque
}

// Un fallo pintando UN tab no puede tumbar el arranque ni dejar la pestaña
// mostrando el contenido de la anterior: sin este try/catch, una excepción
// abortaba el arranque entero y dejaba la app sin service worker (adiós
// actualizaciones) y sin la oferta de restaurar el historial.
function paintTab(tab, panel) {
  try {
    tab.render(panel);
  } catch (err) {
    console.error('[gym-tracker] render del tab', tab.id, err);
    clear(panel);
    panel.appendChild(el('div', { class: 'g-empty-card' }, [
      'Esta pestaña falló al cargar. Cierra y vuelve a abrir la app.'
    ]));
  }
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
  paintTab(tab, panels[activeId]);
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
                // El chequeo del arranque corrió con la base vacía y no vio
                // nada que migrar. Ahora que acaban de entrar 36 ejercicios con
                // el etiquetado viejo, hay que volver a mirar.
                maybeOfferMuscleMigration();
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
