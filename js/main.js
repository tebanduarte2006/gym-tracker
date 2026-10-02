// main.js — bootstrap: shell de tabs, service worker, seed inicial.
// Gym Tracker es una app de UN solo módulo: no hay home ni registry (la
// arquitectura de módulos de habitos-app era overhead sin uso aquí).

import { el, clear, toast, guard, sinMovimiento } from './dom.js';
import { dbGetAll, dbPut, prefGet, prefSet, dbBulkImport } from './db.js';
import { registerSW } from './swupdate.js';
import { normalizeBackup } from './importer.js';
import { installAudioUnlock, setBackgroundAlarm } from './audio.js';
import { renderEntrenar, suspendEntrenar } from './ui/entrenar.js';
import { renderEjercicios } from './ui/ejercicios.js';
import { renderProgresion } from './ui/progresion.js';
import { sheet, confirmRow, once } from './ui/modals.js';
import { openSettings } from './ui/ajustes.js';
import { startThemeSync } from './theme.js';
import { planMuscleMigration } from './muscles.js';

const TABS = [
  { id: 'entrenar', label: 'Entrenar', render: renderEntrenar },
  { id: 'ejercicios', label: 'Ejercicios', render: renderEjercicios },
  { id: 'progresion', label: 'Progresión', render: renderProgresion }
];

// El título y la barra de tabs viven ESTÁTICOS en index.html a propósito: son
// lo único que iOS puede pintar antes de descargar y ejecutar los módulos, y
// sin ellos el arranque en frío de la PWA era una pantalla negra de segundos.
// No los muevas de vuelta a JS "por limpieza" — ver docs/rutas/arranque-y-actualizaciones.md.
function boot() {
  // Apariencia: el <head> ya pintó el modo correcto; esto lo mantiene al día si
  // el iPhone cambia de modo con la app abierta (Ajustes → Apariencia).
  startThemeSync();
  installAudioUnlock();
  // La alarma de fin de descanso puede sonar con la pantalla bloqueada a costa
  // de ocupar el reproductor del sistema (y pausar tu música). Es una decisión
  // suya, así que vive en una preferencia; se lee aquí y no en el rest timer
  // para que audio.js no dependa de IndexedDB. Ver js/audio.js y Ajustes.
  prefGet('alarma_fondo', true)
    .then((v) => setBackgroundAlarm(v !== false))
    .catch(() => {});
  const content = document.getElementById('tab-content');

  // Los paneles nacen OCULTOS y el esqueleto de arranque se queda en pantalla
  // hasta que el primero tenga datos. Antes se borraba el esqueleto aquí mismo
  // y la app enseñaba un rectángulo negro vacío hasta que volvía IndexedDB: el
  // esqueleto existe justo para que ese hueco no se vea (docs/rutas/arranque-y-actualizaciones.md).
  const panels = {};
  TABS.forEach((tab) => {
    const btn = document.getElementById('tab-btn-' + tab.id);
    if (btn) btn.addEventListener('click', () => switchTab(tab.id, panels));
    const panel = el('div', { class: 'tab-panel', id: 'panel-' + tab.id });
    panels[tab.id] = panel;
    content.appendChild(panel);
  });

  // Ajustes (⚙︎ junto al título). Si se importa un backup desde ahí, se repinta
  // la pestaña visible para que muestre los datos nuevos.
  const settingsBtn = document.getElementById('settings-btn');
  if (settingsBtn) settingsBtn.addEventListener('click', () => openSettings({
    onDataImported: () => {
      const tab = TABS.find((t) => t.id === _tabActivo);
      if (tab) paintTab(tab, panels[tab.id]);
    }
  }));

  // SOLO se pinta el tab visible. Antes se pintaban los tres al arrancar: nueve
  // lecturas completas de IndexedDB (sesiones, sets, ejercicios, cardio…) antes
  // de que se viera nada, en un iPhone 11 y encima del arranque en frío que ya
  // costó tres arreglos (ver docs/rutas/arranque-y-actualizaciones.md). Ejercicios y Progresión se
  // pintan solos al tocarlos: `switchTab` ya re-renderiza en CADA cambio de
  // pestaña, así que no hay nada que precalentar.
  const primero = panels[TABS[0].id];
  let mostrado = false;
  const mostrarPrimero = () => {
    if (mostrado) return;
    mostrado = true;
    const esq = content.querySelector('.g-boot-skeleton');
    if (esq) esq.remove();
    entrar(primero);
  };
  paintTab(TABS[0], primero).then(mostrarPrimero);
  // Tope de seguridad: si la primera lectura se eterniza, el esqueleto se
  // queda (que es lo correcto, para eso está) pero no más allá de esto. El
  // vigilante de los 8 s de index.html sigue cubriendo el caso de que nunca
  // llegue nada.
  setTimeout(mostrarPrimero, ARRANQUE_TOPE_MS);
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
//
// DEVUELVE una promesa que resuelve cuando el tab tiene ya sus datos en el DOM:
// es lo que permite pintarlo oculto y revelarlo entero en vez de enseñarlo
// vacío mientras IndexedDB contesta. Nunca se rechaza — un fallo de datos ya lo
// avisó `guard()` por toast, y el panel tiene que revelarse igual.
function paintTab(tab, panel) {
  let p;
  try {
    p = tab.render(panel);
  } catch (err) {
    console.error('[gym-tracker] render del tab', tab.id, err);
    clear(panel);
    panel.appendChild(el('div', { class: 'g-empty-card' }, [
      'Esta pestaña falló al cargar. Cierra y vuelve a abrir la app.'
    ]));
    return Promise.resolve();
  }
  return Promise.resolve(p).catch(() => {});
}

// ─── Cambio de pestaña ────────────────────────────────────────────────────────
// Esteban lo describió así: *"hago click y muestra un flash de lo que hay en esa
// página; se siente muy feo"*. No era una animación que faltara, era el ORDEN.
// `switchTab` marcaba el panel como visible y DESPUÉS lo pintaba — y pintar es
// `clear()` más rellenar cuando vuelve IndexedDB, o sea que el panel entraba en
// pantalla VACÍO y el contenido caía encima uno o dos frames más tarde. Encima
// el `scrollTo` suave animaba la página justo mientras el contenido se
// reemplazaba debajo.
//
// Ahora el panel se pinta TODAVÍA OCULTO y solo se revela cuando sus datos ya
// están en el DOM: no existe ningún frame con la pantalla a medias. Mientras
// tanto el panel que se va se desvanece, así que tampoco hay un corte seco.
//
// Cuatro cosas que parecen detalles y no lo son:
// · La pastilla de la pestaña se marca al INSTANTE, sin esperar datos. El
//   control que tocas responde siempre, aunque el contenido tarde un pelo; al
//   revés se siente como que la app ignoró el toque.
// · `_seq` descarta el render que llegó tarde. Sin él, cambiar dos veces rápido
//   podía revelar el panel equivocado cuando la primera lectura contestara.
// · Hay un TOPE de espera. Un parpadeo raro es mejor que una app que parece
//   colgada porque IndexedDB se durmió.
// · El scroll vuelve arriba de golpe y en el mismo instante del relevo, no
//   animado: un scroll animado mientras cambia el contenido es exactamente lo
//   que se siente brusco.
const SALIDA_MS = 120;        // desvanecido del panel que se va
const TOPE_MS = 260;          // espera máxima por los datos del que entra
const ARRANQUE_TOPE_MS = 1200; // espera máxima del esqueleto en el arranque

let _tabActivo = TABS[0].id;
let _seq = 0;

// Revela un panel con el fundido de entrada. La animación se reinicia a mano
// (quitar la clase, forzar un reflow, volver a ponerla) porque volver rápido a
// una pestaña reutiliza el mismo nodo y el navegador no relanza una animación
// que ya estaba puesta.
function entrar(panel) {
  panel.classList.add('active');
  panel.classList.remove('g-tab-enter');
  if (sinMovimiento()) return;
  void panel.offsetWidth;
  panel.classList.add('g-tab-enter');
}

function switchTab(activeId, panels) {
  // Tocar la pestaña en la que YA estás no re-renderiza nada: sube al inicio,
  // como cualquier app de iOS. Antes repintaba la pantalla entera, o sea que el
  // gesto más inofensivo de la barra provocaba el parpadeo completo.
  if (activeId === _tabActivo) {
    if (window.scrollY > 0) window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  const saliente = panels[_tabActivo];
  _tabActivo = activeId;
  const seq = ++_seq;

  // El tab que se va deja de consumir CPU: su cronómetro de sesión seguía
  // latiendo 1×/s en segundo plano mientras mirabas otra pestaña.
  if (activeId !== 'entrenar') suspendEntrenar();

  TABS.forEach((tab) => {
    const btn = document.getElementById('tab-btn-' + tab.id);
    if (btn) btn.classList.toggle('active', tab.id === activeId);
  });

  const quieto = sinMovimiento();
  const entrante = panels[activeId];
  const tab = TABS.find((t) => t.id === activeId);
  if (saliente && saliente !== entrante && !quieto) saliente.classList.add('g-tab-leaving');

  let datos = false;
  let salida = quieto;
  let hecho = false;
  const relevo = () => {
    if (hecho || !datos || !salida) return;
    hecho = true;
    if (seq !== _seq) return;   // cambiaste otra vez mientras esperaba
    TABS.forEach((t) => {
      panels[t.id].classList.remove('g-tab-leaving');
      if (t.id !== activeId) panels[t.id].classList.remove('active');
    });
    if (window.scrollY > 0) window.scrollTo(0, 0);
    entrar(entrante);
  };
  const listo = () => { datos = true; relevo(); };

  paintTab(tab, entrante).then(listo);
  setTimeout(listo, TOPE_MS);
  if (!quieto) setTimeout(() => { salida = true; relevo(); }, SALIDA_MS);
  else relevo();
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
