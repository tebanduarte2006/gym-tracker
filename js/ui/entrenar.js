// entrenar.js — Tab 1: sesión activa, historial de sesiones, cardio.
//
// Decisiones clave (ver README §Lecciones):
// · Render QUIRÚRGICO: agregar un set o cambiar un status actualiza solo la
//   card afectada. La app vieja re-renderizaba toda la lista y colapsaba las
//   cards en pleno entrenamiento.
// · Rest timer por timestamp (resttimer.js) + beep Web Audio + Wake Lock.
// · Al finalizar, los sets Pending se ELIMINAN de verdad (la vieja avisaba
//   "se descartarán" pero los dejaba en la DB).

import { el, clear, toast, guard } from '../dom.js';
import {
  dbGetAll, dbGetAllBy, dbPut, dbDelete, dbDeleteSessionCascade, prefGet, prefSet
} from '../db.js';
import {
  fmtWeight, fmtDateShort, fmtDateLong, fmtDuration, fmtInt, kgToLbs,
  inputToKg, parseDecimal, normalizeKey, tsToDatetimeLocal
} from '../format.js';
import { STATUS, visibleSets, volumeKg, sessionTs, nextWorkoutNumber, suggestNextSet } from '../stats.js';
import { plateBreakdown, DEFAULT_BAR_LBS } from '../plates.js';
import { startRest, stopRest, restActive, restState, bindRestUI } from '../resttimer.js';
import { keepAwake, releaseAwake } from '../wakelock.js';
import { ICON } from './icons.js';
import { sheet, confirmAction, confirmRow, attachSuggest, once } from './modals.js';
import { showNewExerciseModal } from './ejercicios.js';

const DEFAULT_REST = 90;

let _ack = null;                    // sesión activa ya "reconocida" en esta apertura
let _sessionTimerId = null;
let _openEj = new Set();            // cards abiertas (persiste entre refreshes)
let _restOverrides = {};            // ejId → sec, solo esta sesión (en memoria)
let _restDefault = DEFAULT_REST;

// ─── Entry point ──────────────────────────────────────────────────────────────
export function renderEntrenar(panel) {
  clear(panel);
  stopSessionTimer();
  guard(Promise.all([dbGetAll('sesiones'), prefGet('rest_default', DEFAULT_REST)]), 'cargando sesiones')
    .then(([sesiones, restDef]) => {
      _restDefault = Number(restDef) || DEFAULT_REST;
      const activa = sesiones.find((s) => s.finalizada !== true);
      if (activa) {
        if (_ack === activa.id) renderActiveSession(panel, activa);
        else promptResume(panel, activa);
      } else {
        _ack = null;
        releaseAwake();
        renderStartScreen(panel, sesiones);
      }
    });
}

// ─── Pantalla inicial (sin sesión activa) ─────────────────────────────────────
function renderStartScreen(panel, sesiones) {
  const wrap = el('div', { class: 'g-start' });

  const finalizadas = sesiones
    .filter((s) => s.finalizada === true)
    .sort((a, b) => sessionTs(b) - sessionTs(a));

  if (finalizadas.length > 0) {
    const headRow = el('div', { class: 'g-head-row' }, [
      el('div', { class: 'g-section-label', style: 'padding:0;' }, ['ÚLTIMAS SESIONES'])
    ]);
    const verTodas = el('button', { class: 'g-link-btn', type: 'button' }, ['Ver todas →']);
    verTodas.addEventListener('click', () => renderAllSessions(panel));
    headRow.appendChild(verTodas);
    wrap.appendChild(headRow);
    wrap.appendChild(buildSessionCards(panel, finalizadas.slice(0, 3), false));
  } else {
    wrap.appendChild(el('div', { class: 'g-empty-card' }, [
      'Aún no hay sesiones. Toca "Iniciar sesión" para empezar.'
    ]));
  }

  const startBtn = el('button', { class: 'g-start-cta', type: 'button' }, ['▶ Iniciar sesión']);
  startBtn.addEventListener('click', () => showStartModal(panel));
  wrap.appendChild(startBtn);
  panel.appendChild(wrap);
}

function buildSessionCards(panel, sesiones, fromAll) {
  const list = el('div', { class: 'g-recent-list' });
  guard(dbGetAll('sets'), 'cargando sets').then((allSets) => {
    sesiones.forEach((s) => {
      const count = visibleSets(allSets.filter((st) => st.sesion_id === s.id)).length;
      const card = el('div', { class: 'g-recent-card' }, [
        el('div', {}, [
          el('div', { class: 'g-recent-name' }, [s.nombre || 'Workout']),
          el('div', { class: 'g-recent-sub' }, [
            fmtDateLong(s.fecha) + ' · ' + count + (count === 1 ? ' set' : ' sets')
          ])
        ]),
        el('div', { class: 'g-recent-meta' }, [s.duracion_ms ? fmtDuration(s.duracion_ms) : ''])
      ]);
      card.addEventListener('click', () => renderSessionDetail(panel, s.id, fromAll));
      list.appendChild(card);
    });
  });
  return list;
}

function renderAllSessions(panel) {
  clear(panel);
  const wrap = el('div', { class: 'g-start' });
  const back = el('button', { class: 'g-back-inline', type: 'button' }, ['Entrenar']);
  back.addEventListener('click', () => renderEntrenar(panel));
  wrap.appendChild(back);
  wrap.appendChild(el('h2', { class: 'g-detail-title', style: 'margin-left:4px;' }, ['Todas las sesiones']));
  panel.appendChild(wrap);

  guard(dbGetAll('sesiones'), 'cargando sesiones').then((sesiones) => {
    const fin = sesiones.filter((s) => s.finalizada === true).sort((a, b) => sessionTs(b) - sessionTs(a));
    if (fin.length === 0) {
      wrap.appendChild(el('div', { class: 'g-empty-card' }, ['No hay sesiones finalizadas.']));
      return;
    }
    wrap.appendChild(buildSessionCards(panel, fin, true));
  });
}

// ─── Detalle de sesión finalizada ─────────────────────────────────────────────
function renderSessionDetail(panel, sesionId, fromAll) {
  clear(panel);
  const wrap = el('div', { class: 'g-start' });
  const back = el('button', { class: 'g-back-inline', type: 'button' }, [
    fromAll ? 'Todas las sesiones' : 'Entrenar'
  ]);
  back.addEventListener('click', () => (fromAll ? renderAllSessions(panel) : renderEntrenar(panel)));
  wrap.appendChild(back);
  panel.appendChild(wrap);

  guard(Promise.all([
    dbGetAll('sesiones'),
    dbGetAllBy('sets', 'sesion_id', sesionId),
    dbGetAll('ejercicios'),
    dbGetAllBy('cardio', 'sesion_id', sesionId)
  ]), 'cargando sesión').then(([sesiones, sets, ejercicios, cardio]) => {
    const sesion = sesiones.find((x) => x.id === sesionId);
    if (!sesion) { renderEntrenar(panel); return; }
    const ejMap = {};
    ejercicios.forEach((e) => { ejMap[e.id] = e; });
    const visible = visibleSets(sets);
    const done = visible.filter((s) => s.status === STATUS.DONE || !s.status).length;
    const ejIds = [...new Set(visible.map((s) => s.ejercicio_id))];
    const volLbs = Math.round(kgToLbs(volumeKg(visible)) || 0);
    const cardioMin = cardio.reduce((sum, c) => sum + (Number(c.duracion_min) || 0), 0);

    wrap.appendChild(el('div', { class: 'g-session-card', style: 'margin-top:8px;' }, [
      el('div', { class: 'g-session-rt' }, [(sesion.routine_type || '').toUpperCase()]),
      el('div', { class: 'g-session-name' }, [sesion.nombre || 'Workout']),
      el('div', { class: 'g-recent-sub', style: 'margin-top:6px;' }, [fmtDateLong(sesion.fecha)])
    ]));

    const stats = el('div', { class: 'g-confirm-summary', style: 'margin-top:14px;' }, [
      confirmRow('Duración', sesion.duracion_ms ? fmtDuration(sesion.duracion_ms) : '—'),
      confirmRow('Ejercicios', String(ejIds.length)),
      confirmRow('Sets completados', done + ' / ' + visible.length),
      confirmRow('Volumen total', fmtInt(volLbs) + ' lbs')
    ]);
    if (cardioMin > 0) stats.appendChild(confirmRow('Cardio', cardioMin + ' min'));
    wrap.appendChild(stats);

    const byEj = {};
    visible.forEach((s) => { (byEj[s.ejercicio_id] = byEj[s.ejercicio_id] || []).push(s); });
    Object.keys(byEj).forEach((ejId) => {
      const ej = ejMap[ejId];
      if (!ej) return;
      const ejCard = el('div', { class: 'g-ex-card open', style: 'margin-top:10px;' });
      ejCard.appendChild(el('div', { class: 'g-ex-head', style: 'cursor:default;' }, [
        el('div', { class: 'g-ex-name' }, [ej.nombre])
      ]));
      const setsList = el('div', { class: 'g-sets-list', style: 'padding:0 18px 14px;' });
      byEj[ejId]
        .sort((a, b) => (a.orden || a.id) - (b.orden || b.id))
        .forEach((st, idx) => {
          const statusLabel = st.status === STATUS.SKIPPED ? ' · saltado'
            : st.status === STATUS.PENDING ? ' · pendiente' : '';
          setsList.appendChild(el('div', { class: 'g-set-row' }, [
            el('div', { class: 'g-set-info' }, [
              'Set ' + (idx + 1) + ' · ' + fmtWeight(st.peso) + ' lbs × ' + (Number(st.reps) || 0) + ' reps' + statusLabel
            ])
          ]));
        });
      ejCard.appendChild(setsList);
      wrap.appendChild(ejCard);
    });

    if (cardio.length > 0) {
      wrap.appendChild(el('div', { class: 'g-section-label' }, ['CARDIO']));
      cardio.sort((a, b) => (a.orden || a.id) - (b.orden || b.id)).forEach((c) => {
        wrap.appendChild(buildCardioRow(c, null));
      });
    }

    const actions = el('div', { class: 'g-actions-col' });
    const editBtn = el('button', { class: 'g-btn-secondary', type: 'button' }, ['✏️ Editar duración']);
    editBtn.addEventListener('click', () => {
      openEditDurationModal(sesion, () => renderSessionDetail(panel, sesionId, fromAll));
    });
    actions.appendChild(editBtn);
    const delBtn = el('button', { class: 'g-btn-secondary', type: 'button', style: 'color:var(--red);' }, ['🗑️ Eliminar sesión']);
    delBtn.addEventListener('click', () => {
      confirmAction('¿Eliminar sesión?',
        'Se eliminarán la sesión "' + (sesion.nombre || 'Workout') + '", sus ' + visible.length +
        ' sets y su cardio. Los ejercicios del directorio no se tocan. Esta acción no se puede deshacer.',
        () => {
          guard(dbDeleteSessionCascade(sesion.id), 'eliminando sesión').then(() => {
            toast('Sesión eliminada');
            fromAll ? renderAllSessions(panel) : renderEntrenar(panel);
          });
        },
        { destructive: true, okLabel: 'Eliminar definitivamente' });
    });
    actions.appendChild(delBtn);
    wrap.appendChild(actions);
  });
}

function openEditDurationModal(sesion, onSaved) {
  const inicioMs = sesion.timestamp_inicio || new Date(sesion.fecha).getTime();
  const s = sheet('Editar duración');
  s.modal.appendChild(el('div', { class: 'g-modal-sub' }, ['Hora de inicio']));
  s.modal.appendChild(el('div', { class: 'g-modal-input', style: 'opacity:.6;pointer-events:none;' }, [
    new Date(inicioMs).toLocaleString('es-CO', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  ]));
  s.modal.appendChild(el('div', { class: 'g-modal-sub', style: 'margin-top:14px;' }, ['Hora de fin']));
  const finInput = el('input', {
    class: 'g-modal-input', type: 'datetime-local',
    value: tsToDatetimeLocal(inicioMs + (sesion.duracion_ms || 0))
  });
  s.modal.appendChild(finInput);
  const save = el('button', { class: 'g-btn-primary', type: 'button' }, ['Guardar']);
  save.addEventListener('click', () => {
    const v = finInput.value;
    const newFin = v ? new Date(v).getTime() : NaN;
    if (isNaN(newFin)) { toast('Hora inválida'); return; }
    if (newFin <= inicioMs) { toast('La hora de fin debe ser posterior al inicio'); return; }
    sesion.duracion_ms = newFin - inicioMs;
    guard(dbPut('sesiones', sesion), 'guardando duración').then(() => {
      s.close();
      toast('Duración actualizada');
      if (onSaved) onSaved();
    });
  });
  s.modal.appendChild(save);
  s.open();
}

// ─── Modal de reanudación ─────────────────────────────────────────────────────
function promptResume(panel, activa) {
  // Fondo del panel: si cierran el sheet sin decidir, no queda en blanco.
  clear(panel);
  const fallback = el('button', { class: 'g-empty-card', type: 'button', style: 'width:100%;margin:20px 0 0;cursor:pointer;' }, [
    'Tienes una sesión sin terminar (' + (activa.routine_type || 'Workout') + '). Toca aquí para decidir qué hacer.'
  ]);
  fallback.addEventListener('click', () => promptResume(panel, activa));
  const fallbackWrap = el('div', { class: 'g-start' }, [fallback]);
  panel.appendChild(fallbackWrap);

  const startTs = sessionTs(activa) || Date.now();
  guard(dbGetAllBy('sets', 'sesion_id', activa.id), 'cargando sesión activa').then((sets) => {
    const real = visibleSets(sets);
    const nEj = new Set(sets.map((s) => s.ejercicio_id)).size;
    const age = Date.now() - startTs;

    const s = sheet('Sesión sin terminar');
    s.modal.appendChild(el('div', { class: 'g-resume-summary' }, [
      el('div', { class: 'g-resume-meta' }, [
        ((activa.routine_type || 'Workout').toUpperCase()) + ' · iniciada hace ' + fmtDuration(age)
      ]),
      el('div', { class: 'g-resume-stats' }, [
        el('div', {}, [
          el('span', { class: 'g-resume-num' }, [String(nEj)]),
          el('span', { class: 'g-resume-unit' }, [nEj === 1 ? 'ejercicio' : 'ejercicios'])
        ]),
        el('div', {}, [
          el('span', { class: 'g-resume-num' }, [String(real.length)]),
          el('span', { class: 'g-resume-unit' }, [real.length === 1 ? 'set' : 'sets'])
        ])
      ])
    ]));

    const btnResume = el('button', { class: 'g-btn-primary', type: 'button' }, ['Reanudar sesión']);
    btnResume.addEventListener('click', () => {
      s.close();
      _ack = activa.id;
      renderActiveSession(panel, activa);
    });
    const btnSave = el('button', { class: 'g-btn-secondary', type: 'button' }, ['Guardar y cerrar']);
    btnSave.addEventListener('click', () => {
      s.close();
      finalizeSession(activa, sets, panel, { silent: true });
    });
    const btnDelete = el('button', { class: 'g-btn-destructive', type: 'button' }, ['Eliminar sesión']);
    btnDelete.addEventListener('click', () => {
      s.close();
      guard(dbDeleteSessionCascade(activa.id), 'eliminando sesión').then(() => renderEntrenar(panel));
    });
    s.modal.appendChild(btnResume);
    s.modal.appendChild(btnSave);
    s.modal.appendChild(btnDelete);
    s.open();
  });
}

// ─── Iniciar sesión ───────────────────────────────────────────────────────────
function showStartModal(panel) {
  const s = sheet('Iniciar sesión');
  s.modal.appendChild(el('div', { class: 'g-modal-sub' }, ['Tipo de rutina']));
  const input = el('input', {
    class: 'g-modal-input', type: 'text',
    placeholder: 'Ej. Upper, Push, Leg Day…', autocomplete: 'off'
  });
  s.modal.appendChild(input);

  const pillsLabel = el('div', { class: 'g-modal-sub', style: 'margin-top:14px;' }, ['Recientes']);
  const pills = el('div', { class: 'g-pills', style: 'margin-bottom:12px;' });
  s.modal.appendChild(pillsLabel);
  s.modal.appendChild(pills);
  const sugg = el('div', { class: 'g-suggest' });
  s.modal.appendChild(sugg);

  const startBtn = el('button', { class: 'g-btn-primary', type: 'button' }, ['Comenzar entrenamiento']);
  once(startBtn, () => {
    const name = input.value.trim();
    if (!name) { toast('Escribe un nombre para la rutina'); return null; }
    s.close();
    return createSession(panel, name);
  });
  s.modal.appendChild(startBtn);

  guard(Promise.all([dbGetAll('sesiones'), dbGetAll('ejercicios')]), 'cargando rutinas').then(([ses, ejs]) => {
    const names = new Set();
    ses.forEach((x) => x.routine_type && names.add(x.routine_type));
    ejs.forEach((x) => x.tipo && names.add(x.tipo));
    const allNames = [...names].sort();

    const recents = [];
    ses.slice().sort((a, b) => sessionTs(b) - sessionTs(a)).forEach((x) => {
      if (x.routine_type && !recents.includes(x.routine_type) && recents.length < 6) recents.push(x.routine_type);
    });
    if (recents.length === 0) pillsLabel.style.display = 'none';
    recents.forEach((name) => {
      const p = el('button', { class: 'g-pill', type: 'button' }, [name]);
      p.addEventListener('click', () => {
        input.value = name;
        [...pills.children].forEach((c) => c.classList.remove('active'));
        p.classList.add('active');
      });
      pills.appendChild(p);
    });
    attachSuggest(input, sugg, () => allNames, (n) => { input.value = n; }, normalizeKey);
  });

  s.open();
  setTimeout(() => input.focus(), 80);
}

function createSession(panel, routineType) {
  // Contador persistente + máximo del historial: no se repite aunque borres
  // sesiones (bug heredado) ni tras importar un backup con numeración mayor.
  return guard(
    Promise.all([prefGet('contador_workouts', 0), dbGetAll('sesiones')])
      .then(([n, all]) => {
        const num = nextWorkoutNumber(n, all);
        const now = Date.now();
        const sesion = {
          nombre: 'Workout #' + num + ' · ' + routineType,
          fecha: new Date(now).toISOString(),
          timestamp_inicio: now,
          finalizada: false,
          routine_type: routineType,
          ej_orden: []
        };
        return Promise.all([dbPut('sesiones', sesion), prefSet('contador_workouts', num)])
          .then(([id]) => {
            sesion.id = id;
            _ack = id;
            _openEj = new Set();
            _restOverrides = {};
            renderActiveSession(panel, sesion);
          });
      }),
    'creando sesión'
  );
}

// ─── Sesión activa ────────────────────────────────────────────────────────────
function renderActiveSession(panel, sesion) {
  clear(panel);
  keepAwake();
  const wrap = el('div', { class: 'g-train' });

  const sessionCard = el('div', { class: 'g-session-card' }, [
    el('div', { class: 'g-session-meta' }, [
      el('div', { class: 'g-session-rt' }, [(sesion.routine_type || '').toUpperCase()]),
      el('div', { class: 'g-session-name' }, [sesion.nombre || 'Workout'])
    ]),
    el('div', { class: 'g-session-timer-wrap' }, [
      el('div', {}, [
        el('div', { class: 'g-session-timer-label' }, ['DURACIÓN']),
        el('div', { class: 'g-session-timer', id: 'gt-session-timer' }, ['0:00'])
      ])
    ])
  ]);
  wrap.appendChild(sessionCard);
  startSessionTimer(sesion.timestamp_inicio);

  // Rest bar
  const restBar = el('div', { class: 'g-rest-bar hidden' });
  wrap.appendChild(restBar);
  setupRestBar(restBar);

  // Ejercicios
  const exList = el('div', {});
  wrap.appendChild(exList);
  refreshExercises(sesion, exList);

  const addBtn = el('button', { class: 'g-add-exercise', type: 'button' }, ['+ Agregar ejercicio']);
  addBtn.addEventListener('click', () => showAddExerciseModal(sesion, exList));
  wrap.appendChild(addBtn);

  // Cardio
  const cardioWrap = el('div', {});
  wrap.appendChild(cardioWrap);
  refreshCardio(sesion, cardioWrap);
  const addCardio = el('button', { class: 'g-add-exercise', type: 'button' }, ['+ Agregar cardio']);
  addCardio.addEventListener('click', () => showAddCardioModal(sesion, cardioWrap));
  wrap.appendChild(addCardio);

  const finBtn = el('button', { class: 'g-finalize', type: 'button' }, ['■ Finalizar sesión']);
  finBtn.addEventListener('click', () => confirmFinalize(sesion, panel));
  wrap.appendChild(finBtn);

  panel.appendChild(wrap);
}

function startSessionTimer(startTs) {
  stopSessionTimer();
  const tick = () => {
    const elx = document.getElementById('gt-session-timer');
    if (!elx) { stopSessionTimer(); return; }
    elx.textContent = fmtDuration(Date.now() - (startTs || Date.now()));
  };
  tick();
  _sessionTimerId = setInterval(tick, 1000);
}

function stopSessionTimer() {
  if (_sessionTimerId) { clearInterval(_sessionTimerId); _sessionTimerId = null; }
}

// main.js la llama al salir del tab: el panel sigue en el DOM (solo oculto), así
// que el cronómetro seguía latiendo 1×/s mientras mirabas otra pestaña.
// El rest timer NO se toca: debe seguir corriendo aunque cambies de tab.
export function suspendEntrenar() {
  stopSessionTimer();
}

// ─── Rest bar UI ──────────────────────────────────────────────────────────────
function setupRestBar(bar) {
  clear(bar);
  const icon = ICON.clock({ size: 16, color: 'var(--t2)' });
  const label = el('div', { class: 'g-rest-label' }, ['Descanso']);
  const time = el('div', { class: 'g-rest-time' }, ['']);
  const prog = el('div', { class: 'g-rest-progress' });
  const fill = el('div', { class: 'g-rest-progress-fill' });
  prog.appendChild(fill);
  const skip = el('button', { class: 'g-rest-skip', type: 'button' }, ['Saltar']);
  skip.addEventListener('click', () => { stopRest(); bar.classList.add('hidden'); });
  bar.appendChild(icon); bar.appendChild(label); bar.appendChild(time);
  bar.appendChild(prog); bar.appendChild(skip);

  bindRestUI(
    (remaining, total) => {
      bar.classList.remove('hidden');
      time.textContent = remaining + 's';
      fill.style.width = (total > 0 ? (remaining / total) * 100 : 0) + '%';
    },
    () => {
      bar.classList.add('hidden');
      toast('Descanso terminado 💪');
    }
  );
  if (restActive()) {
    const st = restState();
    bar.classList.remove('hidden');
    time.textContent = st.remaining + 's';
  }
}

function resolveRest(ej) {
  if (_restOverrides[ej.id] != null) return _restOverrides[ej.id];
  if (ej.rest_sec != null && Number(ej.rest_sec) > 0) return Number(ej.rest_sec);
  return _restDefault;
}

function openRestConfigModal(ej, onSaved) {
  const s = sheet('Descanso · ' + ej.nombre);
  s.modal.appendChild(el('div', { class: 'g-modal-sub' }, ['Segundos de descanso']));
  const input = el('input', {
    class: 'g-modal-input', type: 'number', inputmode: 'numeric',
    value: String(resolveRest(ej)), min: '10', step: '5'
  });
  s.modal.appendChild(input);
  s.modal.appendChild(el('div', { class: 'g-modal-body', style: 'margin-top:10px;' }, [
    'Default actual: ' + (ej.rest_sec || _restDefault) + 's. Puedes aplicarlo solo a esta sesión o guardarlo como default del ejercicio.'
  ]));

  const readVal = () => {
    const v = parseInt(input.value, 10);
    if (!(v >= 10 && v <= 3600)) { toast('Entre 10 y 3600 segundos'); return null; }
    return v;
  };
  const onlySession = el('button', { class: 'g-btn-primary', type: 'button' }, ['Solo esta sesión']);
  onlySession.addEventListener('click', () => {
    const v = readVal(); if (v == null) return;
    _restOverrides[ej.id] = v;
    s.close(); toast('Descanso de ' + v + 's en esta sesión');
    if (onSaved) onSaved();
  });
  const asDefault = el('button', { class: 'g-btn-secondary', type: 'button' }, ['Guardar como default del ejercicio']);
  asDefault.addEventListener('click', () => {
    const v = readVal(); if (v == null) return;
    ej.rest_sec = v;
    delete _restOverrides[ej.id];
    guard(dbPut('ejercicios', ej), 'guardando descanso').then(() => {
      s.close(); toast('Default de ' + ej.nombre + ': ' + v + 's');
      if (onSaved) onSaved();
    });
  });
  s.modal.appendChild(onlySession);
  s.modal.appendChild(asDefault);
  s.open();
}

// ─── Lista de ejercicios de la sesión ─────────────────────────────────────────
function refreshExercises(sesion, listEl) {
  clear(listEl);
  // `sesiones` se carga UNA vez aquí y se pasa a las cards. Antes cada card
  // hacía su propio dbGetAll('sesiones') completo dentro de loadLastSession:
  // con 8 ejercicios en la sesión eran 8 barridos de la tabla entera para
  // pintar una pantalla.
  guard(Promise.all([
    dbGetAllBy('sets', 'sesion_id', sesion.id),
    dbGetAll('ejercicios'),
    dbGetAll('sesiones')
  ]), 'cargando ejercicios')
    .then(([sets, ejercicios, sesiones]) => {
      const ejMap = {};
      ejercicios.forEach((e) => { ejMap[e.id] = e; });
      const sesMap = {};
      sesiones.forEach((s) => { sesMap[s.id] = s; });

      // Orden: sesion.ej_orden si existe; si no, primera aparición en sets.
      const seen = [];
      sets.slice().sort((a, b) => (a.orden || a.id) - (b.orden || b.id)).forEach((st) => {
        if (!seen.includes(st.ejercicio_id)) seen.push(st.ejercicio_id);
      });
      let order = Array.isArray(sesion.ej_orden) && sesion.ej_orden.length > 0
        ? sesion.ej_orden.filter((id) => seen.includes(id))
        : seen;
      seen.forEach((id) => { if (!order.includes(id)) order.push(id); });

      if (order.length === 0) {
        listEl.appendChild(el('div', { class: 'g-empty-card' }, ['Toca "+ Agregar ejercicio" para empezar.']));
        return;
      }
      if (_openEj.size === 0 && order.length > 0) _openEj.add(order[0]);

      order.forEach((ejId, idx) => {
        const ej = ejMap[ejId];
        if (!ej) return;
        listEl.appendChild(buildExerciseCard(sesion, ej, listEl, { idx, total: order.length, order, sesMap }));
      });
    });
}

function buildExerciseCard(sesion, ej, listEl, pos) {
  const card = el('div', { class: 'g-ex-card' + (_openEj.has(ej.id) ? ' open' : '') });

  // Header
  const head = el('button', { class: 'g-ex-head', type: 'button' });
  head.appendChild(el('div', {}, [
    el('div', { class: 'g-ex-name' }, [ej.nombre]),
    el('div', { class: 'g-ex-muscle' }, [(ej.musculos || []).join(' · ') || 'sin músculo'])
  ]));
  const countEl = el('div', { class: 'g-ex-count' }, ['']);
  const chev = ICON.chevronDown({ size: 18, class: 'g-ex-chevron' });
  head.appendChild(el('div', { class: 'g-ex-head-right' }, [countEl, chev]));
  head.addEventListener('click', () => {
    const open = card.classList.toggle('open');
    open ? _openEj.add(ej.id) : _openEj.delete(ej.id);
  });
  card.appendChild(head);

  const body = el('div', { class: 'g-ex-body' });

  // Tools: descanso · subir · bajar · quitar
  const tools = el('div', { class: 'g-ex-tools' });
  const restBtn = el('button', { class: 'g-tool-btn', type: 'button' }, ['⏱ ' + resolveRest(ej) + 's']);
  restBtn.addEventListener('click', () => openRestConfigModal(ej, () => {
    restBtn.textContent = '⏱ ' + resolveRest(ej) + 's';
  }));
  tools.appendChild(restBtn);
  const platesBtn = el('button', { class: 'g-tool-btn', type: 'button', title: 'Discos por lado' }, ['🏋 Discos']);
  platesBtn.addEventListener('click', () => openPlateModal(addRow.currentLbs()));
  tools.appendChild(platesBtn);
  if (pos && pos.total > 1) {
    const up = el('button', { class: 'g-tool-btn', type: 'button', title: 'Subir' }, ['↑']);
    const down = el('button', { class: 'g-tool-btn', type: 'button', title: 'Bajar' }, ['↓']);
    const move = (delta) => {
      const order = pos.order.slice();
      const i = order.indexOf(ej.id);
      const j = i + delta;
      if (j < 0 || j >= order.length) return;
      [order[i], order[j]] = [order[j], order[i]];
      sesion.ej_orden = order;
      guard(dbPut('sesiones', sesion), 'reordenando').then(() => refreshExercises(sesion, listEl));
    };
    up.addEventListener('click', () => move(-1));
    down.addEventListener('click', () => move(1));
    tools.appendChild(up);
    tools.appendChild(down);
  }
  const delEx = el('button', { class: 'g-tool-btn', type: 'button', title: 'Quitar ejercicio' }, ['🗑']);
  delEx.addEventListener('click', () => {
    confirmAction('Quitar ejercicio', '¿Quitar "' + ej.nombre + '" y sus sets de esta sesión?', () => {
      guard(dbGetAllBy('sets', 'sesion_id', sesion.id), 'quitando ejercicio').then((all) => {
        const mine = all.filter((s) => s.ejercicio_id === ej.id);
        Promise.all(mine.map((s) => dbDelete('sets', s.id))).then(() => {
          sesion.ej_orden = (sesion.ej_orden || []).filter((id) => id !== ej.id);
          _openEj.delete(ej.id);
          dbPut('sesiones', sesion).then(() => refreshExercises(sesion, listEl));
        });
      });
    }, { destructive: true, okLabel: 'Quitar' });
  });
  tools.appendChild(delEx);
  body.appendChild(tools);

  // Última sesión (colapsable) + copiar
  const lastToggle = el('button', { class: 'g-last-toggle', type: 'button' }, [
    el('span', { class: 'g-last-chev' }, ['›']), 'Última sesión'
  ]);
  const lastDateSpan = el('span', { class: 'g-last-date' }, ['']);
  lastToggle.appendChild(lastDateSpan);
  body.appendChild(lastToggle);
  const lastBody = el('div', { class: 'g-last-body' }, [
    el('div', { class: 'g-last-empty' }, ['Cargando…'])
  ]);
  body.appendChild(lastBody);
  lastToggle.addEventListener('click', () => {
    const open = lastToggle.classList.toggle('open');
    card.classList.toggle('last-open', open);
  });

  // Sets
  const setsList = el('div', { class: 'g-sets-list' });
  body.appendChild(setsList);

  // Add-set row
  const addRow = buildAddSetRow(sesion, ej, () => updateSets());
  body.appendChild(addRow.row);

  card.appendChild(body);

  // Render quirúrgico: solo esta card re-consulta y re-pinta sus sets.
  function updateSets() {
    guard(dbGetAllBy('sets', 'sesion_id', sesion.id), 'cargando sets').then((all) => {
      const mine = visibleSets(all.filter((s) => s.ejercicio_id === ej.id))
        .sort((a, b) => (a.orden || a.id) - (b.orden || b.id));
      clear(setsList);
      mine.forEach((st, idx) => {
        setsList.appendChild(buildSetRow(sesion, ej, st, idx + 1, () => updateSets()));
      });
      const done = mine.filter((s) => (s.status || STATUS.DONE) === STATUS.DONE).length;
      countEl.textContent = done + '/' + mine.length;
      addRow.setNextOrden(mine.length > 0 ? Math.max(...mine.map((s) => s.orden || 0)) + 1 : 1);
      // El fantasma avanza con la serie: tras registrar el set 2, propone lo que
      // hiciste en el set 3 de la última sesión, no otra vez el 1.
      addRow.setDone(mine.length);
    });
  }
  updateSets();

  // Última sesión: datos + botón copiar
  loadLastSession(ej.id, sesion.id, pos && pos.sesMap).then((prev) => {
    clear(lastBody);
    // Alimenta el set fantasma de la fila de "agregar set".
    addRow.setPrev(prev ? prev.sets : []);
    if (!prev || prev.sets.length === 0) {
      lastBody.appendChild(el('div', { class: 'g-last-empty' }, ['N/A — sin registros previos']));
      return;
    }
    lastDateSpan.textContent = ' · ' + fmtDateShort(prev.fecha);
    lastBody.appendChild(el('div', { class: 'g-last-header' }, [fmtDateLong(prev.fecha)]));
    prev.sets.forEach((st, i) => {
      lastBody.appendChild(el('div', { class: 'g-last-row' }, [
        el('span', {}, ['Set ' + (i + 1)]),
        el('span', {}, [
          el('b', {}, [fmtWeight(st.peso)]), ' lbs × ', el('b', {}, [String(st.reps)])
        ])
      ]));
    });
    const copyBtn = el('button', { class: 'g-copy-last', type: 'button' }, ['⧉ Copiar estos sets']);
    copyBtn.addEventListener('click', () => {
      guard(dbGetAllBy('sets', 'sesion_id', sesion.id), 'copiando sets').then((all) => {
        const mine = all.filter((s) => s.ejercicio_id === ej.id);
        let orden = mine.length > 0 ? Math.max(...mine.map((s) => s.orden || 0)) : 0;
        const inserts = prev.sets.map((st) => {
          orden += 1;
          return dbPut('sets', {
            sesion_id: sesion.id, ejercicio_id: ej.id,
            peso: st.peso, reps: st.reps, orden,
            status: STATUS.PENDING, unidad: st.unidad || null, ts: Date.now()
          });
        });
        Promise.all(inserts).then(() => {
          toast(prev.sets.length + ' sets copiados como pendientes');
          updateSets();
        });
      });
    });
    lastBody.appendChild(copyBtn);
  });

  return card;
}

// Última sesión FINALIZADA con sets reales de este ejercicio.
// `sesMap` lo provee refreshExercises (una sola carga para todas las cards);
// si no llega, se carga aquí como respaldo.
function loadLastSession(ejercicioId, excludeSesionId, sesMap) {
  const sesionesPromise = sesMap
    ? Promise.resolve(sesMap)
    : dbGetAll('sesiones').then((arr) => {
        const m = {};
        arr.forEach((s) => { m[s.id] = s; });
        return m;
      });
  return guard(Promise.all([dbGetAllBy('sets', 'ejercicio_id', ejercicioId), sesionesPromise]), 'última sesión')
    .then(([sets, sesionMap]) => {
      const real = visibleSets(sets).filter((s) => {
        if (s.sesion_id === excludeSesionId) return false;
        const ses = sesionMap[s.sesion_id];
        return ses && ses.finalizada === true;
      });
      if (real.length === 0) return null;
      const bySes = {};
      real.forEach((s) => { (bySes[s.sesion_id] = bySes[s.sesion_id] || []).push(s); });
      const ids = Object.keys(bySes).map(Number).sort((a, b) => sessionTs(sesionMap[b]) - sessionTs(sesionMap[a]));
      const pick = ids[0];
      return {
        fecha: sesionMap[pick] ? sesionMap[pick].fecha : null,
        sets: bySes[pick].sort((a, b) => (a.orden || a.id) - (b.orden || b.id))
      };
    });
}

// Modal de corrección de un set ya guardado. Antes la única forma de arreglar
// un "135" tecleado donde iba "155" era borrar el set y volver a crearlo, lo
// que además le cambiaba el orden.
function openEditSetModal(set, num, onSaved) {
  const s = sheet('Editar set ' + num);
  let unit = set.unidad === 'kg' ? 'kg' : 'lbs';
  const shown = unit === 'kg' ? Math.round(Number(set.peso) * 1000) / 1000 : kgToLbs(set.peso);

  s.modal.appendChild(el('div', { class: 'g-modal-sub' }, ['Peso']));
  const pesoInput = el('input', {
    class: 'g-modal-input', type: 'text', inputmode: 'decimal',
    autocomplete: 'off', value: shown == null ? '' : String(shown)
  });
  s.modal.appendChild(pesoInput);

  const lbsBtn = el('button', { type: 'button', class: unit === 'lbs' ? 'active' : null }, ['lbs']);
  const kgBtn = el('button', { type: 'button', class: unit === 'kg' ? 'active' : null }, ['kg']);
  const setUnit = (u) => {
    // Reexpresa el valor visible en la unidad nueva: cambiar el toggle no debe
    // reinterpretar 100 lbs como 100 kg.
    const actual = parseDecimal(pesoInput.value);
    if (isFinite(actual)) {
      const kg = inputToKg(actual, unit);
      pesoInput.value = String(u === 'kg' ? Math.round(kg * 1000) / 1000 : kgToLbs(kg));
    }
    unit = u;
    lbsBtn.classList.toggle('active', u === 'lbs');
    kgBtn.classList.toggle('active', u === 'kg');
  };
  lbsBtn.addEventListener('click', () => setUnit('lbs'));
  kgBtn.addEventListener('click', () => setUnit('kg'));
  s.modal.appendChild(el('div', { class: 'g-unit-toggle', style: 'margin-top:8px;' }, [lbsBtn, kgBtn]));

  s.modal.appendChild(el('div', { class: 'g-modal-sub', style: 'margin-top:14px;' }, ['Reps']));
  const repsInput = el('input', {
    class: 'g-modal-input', type: 'number', inputmode: 'numeric', step: '1',
    value: String(Number(set.reps) || 0)
  });
  s.modal.appendChild(repsInput);

  const save = el('button', { class: 'g-btn-primary', type: 'button' }, ['Guardar cambios']);
  once(save, () => {
    const val = parseDecimal(pesoInput.value);
    const reps = parseInt(repsInput.value, 10);
    if (!(val >= 0) || !(reps > 0)) { toast('Peso y reps requeridos'); return null; }
    set.peso = inputToKg(val, unit);
    set.reps = reps;
    set.unidad = unit;
    return guard(dbPut('sets', set), 'guardando set').then(() => {
      s.close();
      toast('Set actualizado');
      onSaved();
    });
  });
  s.modal.appendChild(save);
  s.open();
}

function buildSetRow(sesion, ej, set, num, onChange) {
  const row = el('div', { class: 'g-set-row' });
  row.appendChild(el('div', { class: 'g-set-n' }, ['Set ' + num]));
  const valores = el('button', { class: 'g-set-edit', type: 'button', title: 'Editar set' }, [
    el('div', { class: 'g-set-val' }, [el('b', {}, [fmtWeight(set.peso)]), el('span', {}, ['lbs'])]),
    el('div', { class: 'g-set-times' }, ['×']),
    el('div', { class: 'g-set-val' }, [el('b', {}, [String(set.reps)])])
  ]);
  valores.addEventListener('click', () => openEditSetModal(set, num, onChange));
  row.appendChild(valores);

  const status = set.status || STATUS.DONE;
  const cfg = {
    Pending: { icon: '○', label: 'Pendiente' },
    Done: { icon: '✓', label: 'Hecho' },
    Skipped: { icon: '✕', label: 'Saltado' }
  }[status];
  const chip = el('button', { class: 'g-chip g-chip-' + status, type: 'button' }, [
    el('span', { style: 'font-weight:700;' }, [cfg.icon]), cfg.label
  ]);
  chip.addEventListener('click', () => {
    const next = status === STATUS.PENDING ? STATUS.DONE
      : status === STATUS.DONE ? STATUS.SKIPPED : STATUS.PENDING;
    set.status = next;
    guard(dbPut('sets', set), 'actualizando set').then(() => {
      if (next === STATUS.DONE) startRest(resolveRest(ej)); // completar un set pendiente también descansa
      onChange();
    });
  });
  row.appendChild(chip);

  const del = el('button', { class: 'g-set-del', type: 'button', title: 'Eliminar set' }, ['×']);
  del.addEventListener('click', () => {
    // El "×" vive a un centímetro del chip de estado y se toca por error con el
    // pulgar en pleno entrenamiento. Un diálogo de confirmación por cada set
    // sería insoportable, así que se borra ya y se ofrece deshacer: el registro
    // conserva su `id`, así que reponerlo lo devuelve a su sitio y a su orden.
    const respaldo = { ...set };
    guard(dbDelete('sets', set.id), 'eliminando set').then(() => {
      onChange();
      toast('Set eliminado', {
        label: 'Deshacer',
        onAction: () => {
          guard(dbPut('sets', respaldo), 'restaurando set').then(onChange);
        }
      });
    });
  });
  row.appendChild(del);
  return row;
}

function buildAddSetRow(sesion, ej, onAdded) {
  let unit = 'lbs';
  let nextOrden = 1;
  // Set fantasma: sets de la última sesión finalizada + cuántos llevas hoy.
  // Con los dos se sabe qué proponer (stats.js › suggestNextSet).
  let prevSets = [];
  let yaHechos = 0;
  const row = el('div', { class: 'g-add-set' });
  const pesoInput = el('input', {
    class: 'g-input-num', type: 'text', placeholder: 'Peso',
    inputmode: 'decimal', autocomplete: 'off', pattern: '[0-9]*[.,]?[0-9]*'
  });
  const lbsBtn = el('button', { type: 'button', class: 'active' }, ['lbs']);
  const kgBtn = el('button', { type: 'button' }, ['kg']);
  const setUnit = (u) => {
    unit = u;
    lbsBtn.classList.toggle('active', u === 'lbs');
    kgBtn.classList.toggle('active', u === 'kg');
    paintGhost(); // la sugerencia se muestra en la unidad activa
  };
  lbsBtn.addEventListener('click', () => setUnit('lbs'));
  kgBtn.addEventListener('click', () => setUnit('kg'));
  const toggle = el('div', { class: 'g-unit-toggle' }, [lbsBtn, kgBtn]);
  const repsInput = el('input', {
    class: 'g-input-num', type: 'number', placeholder: 'Reps', step: '1', inputmode: 'numeric'
  });

  // El fantasma va en el `placeholder`, NO en el `value`: si fuera un valor de
  // verdad, registrar lo de la última vez sin querer sería un toque, y corregir
  // un peso exigiría borrar antes de escribir. Como placeholder, teclear encima
  // funciona igual que siempre y el atajo es opt-in.
  function paintGhost() {
    const sug = suggestNextSet(prevSets, yaHechos);
    if (!sug) {
      pesoInput.placeholder = 'Peso';
      repsInput.placeholder = 'Reps';
      return;
    }
    // Un decimal basta: es una pista para leer de reojo, no un valor exacto.
    // 230 lbs son 104.326 kg y "104.326" en gris no se lee, se estorba.
    const shown = unit === 'kg' ? Math.round(sug.peso * 10) / 10 : kgToLbs(sug.peso);
    pesoInput.placeholder = shown == null ? 'Peso' : String(shown);
    repsInput.placeholder = String(sug.reps);
  }

  const confirmBtn = el('button', { class: 'g-confirm-set', type: 'button', title: 'Confirmar set' }, ['+']);
  once(confirmBtn, () => {
    const sug = suggestNextSet(prevSets, yaHechos);
    const rawPeso = pesoInput.value.trim();
    const rawReps = repsInput.value.trim();
    // Campo vacío + fantasma = "repite lo de la última vez", de un solo toque.
    // El peso se toma en kg DIRECTO de la sugerencia, sin pasar por lbs: ir y
    // volver por el display arrastraría su redondeo a un decimal.
    const pesoKg = rawPeso ? inputToKg(parseDecimal(rawPeso), unit) : (sug ? sug.peso : NaN);
    const reps = rawReps ? parseInt(rawReps, 10) : (sug ? sug.reps : NaN);
    if (!(pesoKg >= 0) || !(reps > 0)) { toast('Peso y reps requeridos'); return null; }
    // Se incrementa YA, no cuando vuelva updateSets(): dos toques rápidos
    // creaban dos sets con el mismo `orden` y quedaban en orden aleatorio.
    const orden = nextOrden++;
    return guard(dbPut('sets', {
      sesion_id: sesion.id, ejercicio_id: ej.id,
      peso: pesoKg, reps, orden,
      // Si repitió el fantasma sin teclear, la unidad que tecleó fue la de aquel
      // set, no la que está seleccionada ahora en el toggle.
      status: STATUS.DONE,
      unidad: rawPeso ? unit : ((sug && prevSets[Math.min(yaHechos, prevSets.length - 1)].unidad) || unit),
      ts: Date.now()
    }), 'guardando set').then(() => {
      pesoInput.value = '';
      repsInput.value = '';
      pesoInput.focus();
      onAdded();
      startRest(resolveRest(ej));
    });
  });
  row.appendChild(pesoInput);
  row.appendChild(toggle);
  row.appendChild(repsInput);
  row.appendChild(confirmBtn);

  // Enter encadena peso → reps → guardar, sin soltar el teclado. Registrar un
  // set exigía teclear, bajar a tocar "+" y volver a subir: es LA acción que se
  // repite 25 veces por entrenamiento y era la más lenta de la app.
  pesoInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); repsInput.focus(); }
  });
  repsInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); confirmBtn.click(); }
  });

  // Recordar la última unidad usada en este ejercicio (mejora pedida: hay
  // máquinas donde Esteban registra en kg).
  guard(dbGetAllBy('sets', 'ejercicio_id', ej.id), 'unidad previa').then((all) => {
    const withUnit = all.filter((s) => s.unidad).sort((a, b) => (b.ts || b.id || 0) - (a.ts || a.id || 0));
    if (withUnit.length > 0 && (withUnit[0].unidad === 'kg' || withUnit[0].unidad === 'lbs')) {
      setUnit(withUnit[0].unidad);
    }
  });

  return {
    row,
    setNextOrden(n) { nextOrden = n; },
    // Cuántos sets llevas hoy en este ejercicio → qué set de la última sesión
    // toca proponer. Lo llama updateSets() en cada render quirúrgico.
    setDone(n) { yaHechos = n; paintGhost(); },
    // Sets de la última sesión finalizada. Llega asíncrono desde la card.
    setPrev(sets) { prevSets = Array.isArray(sets) ? sets : []; paintGhost(); },
    // El peso que la calculadora de discos debe abrir por defecto: lo tecleado,
    // o si no la sugerencia del fantasma.
    currentLbs() {
      const raw = pesoInput.value.trim();
      if (raw) {
        const kg = inputToKg(parseDecimal(raw), unit);
        return isFinite(kg) ? kgToLbs(kg) : null;
      }
      const sug = suggestNextSet(prevSets, yaHechos);
      return sug ? kgToLbs(sug.peso) : null;
    }
  };
}

// ─── Calculadora de discos ────────────────────────────────────────────────────
// Qué poner a cada lado de la barra. Trabaja en libras porque los discos del
// gimnasio están marcados en libras: el resultado se lee y se coge, sin
// traducir. El peso de la barra se recuerda en preferencias.
function openPlateModal(initialLbs) {
  const s = sheet('Discos por lado');

  s.modal.appendChild(el('div', { class: 'g-modal-sub' }, ['Peso total (lbs)']));
  const pesoInput = el('input', {
    class: 'g-modal-input', type: 'text', inputmode: 'decimal', autocomplete: 'off',
    placeholder: 'Ej. 185', value: initialLbs != null ? String(Math.round(initialLbs)) : ''
  });
  s.modal.appendChild(pesoInput);

  s.modal.appendChild(el('div', { class: 'g-modal-sub' }, ['Peso de la barra (lbs)']));
  const barInput = el('input', {
    class: 'g-modal-input', type: 'number', inputmode: 'numeric', min: '0',
    value: String(DEFAULT_BAR_LBS)
  });
  s.modal.appendChild(barInput);

  const out = el('div', { style: 'margin-top:18px;' });
  s.modal.appendChild(out);

  function render() {
    clear(out);
    const target = parseDecimal(pesoInput.value);
    const bar = parseDecimal(barInput.value);
    const r = plateBreakdown(target, isFinite(bar) ? bar : DEFAULT_BAR_LBS);

    if (r.error) {
      out.appendChild(el('div', { class: 'g-plate-note g-plate-warn' }, [r.error]));
      return;
    }
    out.appendChild(el('div', { class: 'g-plate-total' }, [
      String(r.totalLbs), el('span', {}, ['lbs en total'])
    ]));

    if (r.perSide.length === 0) {
      out.appendChild(el('div', { class: 'g-plate-note' }, ['Solo la barra, sin discos.']));
    } else {
      const stack = el('div', { class: 'g-plate-stack' });
      r.perSide.forEach((p) => {
        stack.appendChild(el('div', { class: 'g-plate' }, [
          p.cantidad > 1 ? p.cantidad + ' × ' + p.disco : String(p.disco)
        ]));
      });
      out.appendChild(stack);
      out.appendChild(el('div', { class: 'g-plate-note' }, [
        'A cada lado: ' + r.perSide.map((p) => p.cantidad + '×' + p.disco).join(' + ') +
        ' = ' + r.usedLbs + ' lbs.'
      ]));
    }
    if (!r.exacto && r.restoLbs > 0) {
      out.appendChild(el('div', { class: 'g-plate-note g-plate-warn' }, [
        'No se llega exacto: faltan ' + r.restoLbs + ' lbs por lado con los discos estándar.'
      ]));
    }
  }

  pesoInput.addEventListener('input', render);
  barInput.addEventListener('input', render);
  guard(prefGet('bar_lbs', DEFAULT_BAR_LBS), 'peso de barra').then((v) => {
    barInput.value = String(v);
    render();
  });

  const cerrar = el('button', { class: 'g-btn-primary', type: 'button' }, ['Listo']);
  cerrar.addEventListener('click', () => {
    const bar = parseInt(barInput.value, 10);
    if (bar >= 0 && bar <= 200) prefSet('bar_lbs', bar);
    s.close();
  });
  s.modal.appendChild(cerrar);
  render();
  s.open();
}

// ─── Agregar ejercicio a la sesión ────────────────────────────────────────────
function showAddExerciseModal(sesion, listEl) {
  const s = sheet('Agregar ejercicio');
  const searchWrap = el('div', { class: 'g-search-wrap' });
  searchWrap.appendChild(ICON.search({ size: 17, class: 'g-search-icon' }));
  const search = el('input', { class: 'g-search', type: 'text', placeholder: 'Buscar ejercicio…', autocomplete: 'off' });
  searchWrap.appendChild(search);
  s.modal.appendChild(searchWrap);
  const sugg = el('div', { class: 'g-suggest' });
  s.modal.appendChild(sugg);
  const newBtn = el('button', { class: 'g-btn-secondary', type: 'button' }, ['+ Crear ejercicio nuevo']);
  newBtn.addEventListener('click', () => {
    s.close();
    showNewExerciseModal((newEj) => attachExercise(sesion, newEj, listEl), sesion.routine_type);
  });
  s.modal.appendChild(newBtn);

  guard(dbGetAll('ejercicios'), 'cargando directorio').then((all) => {
    function render(term) {
      clear(sugg);
      const t = (term || '').trim();
      if (!t) {
        sugg.appendChild(el('div', { class: 'g-suggest-empty' }, ['Escribe para buscar.']));
        return;
      }
      const tKey = normalizeKey(t);
      const filtered = all
        .filter((e) => normalizeKey(e.nombre).indexOf(tKey) >= 0)
        .sort((a, b) => a.nombre.localeCompare(b.nombre))
        .slice(0, 8);
      if (filtered.length === 0) {
        sugg.appendChild(el('div', { class: 'g-suggest-empty' }, ['Sin coincidencias. Usa "Crear ejercicio nuevo".']));
        return;
      }
      filtered.forEach((e) => {
        const item = el('button', { class: 'g-suggest-row', type: 'button' }, [
          el('div', { style: 'font-weight:600;color:var(--t1);' }, [e.nombre]),
          el('div', { class: 'g-suggest-meta' }, [(e.tipo || '—') + ' · ' + ((e.musculos || []).join(' · ') || 'sin músculo')])
        ]);
        item.addEventListener('click', () => {
          s.close();
          attachExercise(sesion, e, listEl);
        });
        sugg.appendChild(item);
      });
    }
    render('');
    search.addEventListener('input', () => render(search.value));
  });

  s.open();
  setTimeout(() => search.focus(), 80);
}

function attachExercise(sesion, ej, listEl) {
  // Agregar un ejercicio que YA está en la sesión creaba un segundo placeholder
  // huérfano y —peor— lo mandaba al final del orden: bastaba tocarlo por error
  // en el buscador para que el ejercicio en el que estabas trabajando saltara
  // al fondo de la lista. Ahora se detecta y solo se abre su card.
  guard(dbGetAllBy('sets', 'sesion_id', sesion.id), 'agregando ejercicio').then((sets) => {
    _openEj.add(ej.id);
    if (sets.some((s) => s.ejercicio_id === ej.id)) {
      toast(ej.nombre + ' ya está en esta sesión');
      refreshExercises(sesion, listEl);
      return;
    }
    const jobs = [];
    if (sesion.routine_type && ej.tipo !== sesion.routine_type) {
      ej.tipo = sesion.routine_type;
      jobs.push(dbPut('ejercicios', ej));
    }
    // Placeholder que ancla el ejercicio (se limpia al finalizar).
    jobs.push(dbPut('sets', {
      sesion_id: sesion.id, ejercicio_id: ej.id,
      peso: 0, reps: 0, orden: 0, status: STATUS.PENDING, ts: Date.now()
    }));
    sesion.ej_orden = (sesion.ej_orden || []).filter((id) => id !== ej.id).concat([ej.id]);
    jobs.push(dbPut('sesiones', sesion));
    return Promise.all(jobs).then(() => refreshExercises(sesion, listEl));
  });
}

// ─── Cardio ───────────────────────────────────────────────────────────────────
function refreshCardio(sesion, wrap) {
  clear(wrap);
  guard(dbGetAllBy('cardio', 'sesion_id', sesion.id), 'cargando cardio').then((rows) => {
    if (rows.length === 0) return;
    wrap.appendChild(el('div', { class: 'g-section-label' }, ['CARDIO']));
    rows.sort((a, b) => (a.orden || a.id) - (b.orden || b.id)).forEach((c) => {
      wrap.appendChild(buildCardioRow(c, () => refreshCardio(sesion, wrap)));
    });
  });
}

export function buildCardioRow(c, onDeleted) {
  const meta = [];
  if (c.velocidad_kmh != null) meta.push(c.velocidad_kmh + ' km/h');
  if (c.inclinacion != null) meta.push('incl. ' + c.inclinacion);
  const card = el('div', { class: 'g-recent-card', style: 'margin-bottom:8px;' }, [
    el('div', {}, [
      el('div', { class: 'g-recent-name' }, ['🏃 ' + c.tipo]),
      el('div', { class: 'g-recent-sub' }, [c.duracion_min + ' min' + (meta.length ? ' · ' + meta.join(' · ') : '')])
    ])
  ]);
  if (onDeleted) {
    const del = el('button', { class: 'g-set-del', type: 'button', title: 'Eliminar' }, ['×']);
    del.addEventListener('click', () => {
      guard(dbDelete('cardio', c.id), 'eliminando cardio').then(onDeleted);
    });
    card.appendChild(del);
  }
  return card;
}

function showAddCardioModal(sesion, wrap) {
  const s = sheet('Agregar cardio');
  s.modal.appendChild(el('div', { class: 'g-modal-sub' }, ['Tipo']));
  const tipoInput = el('input', {
    class: 'g-modal-input', type: 'text', placeholder: 'Ej. Caminadora, Bicicleta, Escaladora…', autocomplete: 'off'
  });
  s.modal.appendChild(tipoInput);
  const sugg = el('div', { class: 'g-suggest' });
  s.modal.appendChild(sugg);

  s.modal.appendChild(el('div', { class: 'g-modal-sub', style: 'margin-top:12px;' }, ['Duración (min)']));
  const durInput = el('input', { class: 'g-modal-input', type: 'number', inputmode: 'numeric', placeholder: '10', min: '1' });
  s.modal.appendChild(durInput);

  s.modal.appendChild(el('div', { class: 'g-modal-sub', style: 'margin-top:12px;' }, ['Velocidad km/h · opcional']));
  const velInput = el('input', { class: 'g-modal-input', type: 'text', inputmode: 'decimal', placeholder: 'Ej. 4' });
  s.modal.appendChild(velInput);

  s.modal.appendChild(el('div', { class: 'g-modal-sub', style: 'margin-top:12px;' }, ['Inclinación · opcional']));
  const incInput = el('input', { class: 'g-modal-input', type: 'text', inputmode: 'decimal', placeholder: 'Ej. 10' });
  s.modal.appendChild(incInput);

  guard(dbGetAll('cardio'), 'tipos de cardio').then((all) => {
    const tipos = [...new Set(all.map((c) => c.tipo).filter(Boolean))].sort();
    attachSuggest(tipoInput, sugg, () => tipos, (n) => { tipoInput.value = n; }, normalizeKey);
  });

  const save = el('button', { class: 'g-btn-primary', type: 'button' }, ['Agregar']);
  save.addEventListener('click', () => {
    const tipo = tipoInput.value.trim();
    const dur = parseInt(durInput.value, 10);
    if (!tipo) { toast('Escribe el tipo de cardio'); return; }
    if (!(dur > 0)) { toast('Duración en minutos requerida'); return; }
    const vel = parseDecimal(velInput.value);
    const inc = parseDecimal(incInput.value);
    guard(dbPut('cardio', {
      sesion_id: sesion.id, tipo, duracion_min: dur,
      velocidad_kmh: isFinite(vel) ? vel : null,
      inclinacion: isFinite(inc) ? inc : null,
      ts: Date.now()
    }), 'guardando cardio').then(() => {
      s.close();
      toast('Cardio agregado');
      refreshCardio(sesion, wrap);
    });
  });
  s.modal.appendChild(save);
  s.open();
  setTimeout(() => tipoInput.focus(), 80);
}

// ─── Finalizar ────────────────────────────────────────────────────────────────
function confirmFinalize(sesion, panel) {
  guard(Promise.all([
    dbGetAllBy('sets', 'sesion_id', sesion.id),
    dbGetAllBy('cardio', 'sesion_id', sesion.id)
  ]), 'preparando cierre').then(([sets, cardio]) => {
    const visible = visibleSets(sets);
    const done = visible.filter((s) => (s.status || STATUS.DONE) === STATUS.DONE).length;
    const pending = visible.filter((s) => s.status === STATUS.PENDING).length;
    const nEj = new Set(sets.map((s) => s.ejercicio_id)).size;
    const dur = Date.now() - (sesion.timestamp_inicio || Date.now());
    const volLbs = Math.round(kgToLbs(volumeKg(visible)) || 0);
    const cardioMin = cardio.reduce((sum, c) => sum + (Number(c.duracion_min) || 0), 0);

    const s = sheet('¿Finalizar sesión?');
    const summary = el('div', { class: 'g-confirm-summary' }, [
      confirmRow('Duración', fmtDuration(dur)),
      confirmRow('Ejercicios', String(nEj)),
      confirmRow('Sets completados', done + ' / ' + visible.length),
      confirmRow('Volumen total', fmtInt(volLbs) + ' lbs')
    ]);
    if (cardioMin > 0) summary.appendChild(confirmRow('Cardio', cardioMin + ' min'));
    s.modal.appendChild(summary);
    if (pending > 0) {
      s.modal.appendChild(el('div', { class: 'g-confirm-warn' }, [
        pending + (pending === 1 ? ' set pendiente se eliminará' : ' sets pendientes se eliminarán') + ' al finalizar.'
      ]));
    }
    const doneBtn = el('button', { class: 'g-btn-primary', type: 'button' }, ['Finalizar y guardar']);
    once(doneBtn, () => {
      s.close();
      return finalizeSession(sesion, sets, panel, { silent: false });
    });
    const contBtn = el('button', { class: 'g-btn-secondary', type: 'button' }, ['Continuar entrenando']);
    contBtn.addEventListener('click', () => s.close());
    s.modal.appendChild(doneBtn);
    s.modal.appendChild(contBtn);
    s.open();
  });
}

// Cierre real: borra TODOS los Pending (placeholders y copiados sin hacer).
// silent=true (desde "Guardar y cerrar"): la duración se estima con el último
// set registrado, no con "ahora" (evita sesiones fantasma de 20 horas).
function finalizeSession(sesion, sets, panel, { silent }) {
  const pendings = sets.filter((s) => s.status === STATUS.PENDING);
  const inicio = sesion.timestamp_inicio || Date.now();
  let fin = Date.now();
  if (silent) {
    const lastTs = Math.max(0, ...sets.map((s) => s.ts || 0));
    if (lastTs > inicio) fin = lastTs;
    else if (sesion.duracion_ms) fin = inicio + sesion.duracion_ms;
  }
  sesion.finalizada = true;
  sesion.duracion_ms = Math.max(0, fin - inicio);
  return guard(
    Promise.all(pendings.map((s) => dbDelete('sets', s.id))).then(() => dbPut('sesiones', sesion)),
    'finalizando sesión'
  ).then(() => {
    stopSessionTimer();
    stopRest();
    releaseAwake();
    _ack = null;
    _openEj = new Set();
    _restOverrides = {};
    toast('Sesión guardada');
    renderEntrenar(panel);
  });
}
