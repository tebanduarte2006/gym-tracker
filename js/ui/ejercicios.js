// ejercicios.js — Tab 2: directorio de ejercicios, creación, detalle.

import { el, clear, toast, guard } from '../dom.js';
import { dbGetAll, dbGetAllBy, dbPut, prefGet, prefSet } from '../db.js';
import { fmtWeight, fmtDateLong, normalizeKey } from '../format.js';
import { weightPR, isCountable, sessionTs } from '../stats.js';
import { ICON } from './icons.js';
import { sheet, attachSuggest, once } from './modals.js';
import { MUSCLE_GROUPS, MUSCLES, canonicalMuscle } from '../muscles.js';

const _filter = { type: null, search: '' };

export function renderEjercicios(panel) {
  clear(panel);
  const wrap = el('div', { class: 'g-lib' });

  const searchWrap = el('div', { class: 'g-search-wrap' });
  searchWrap.appendChild(ICON.search({ size: 17, class: 'g-search-icon' }));
  const search = el('input', { class: 'g-search', type: 'text', placeholder: 'Buscar ejercicio…', value: _filter.search || '' });
  searchWrap.appendChild(search);
  wrap.appendChild(searchWrap);

  const pills = el('div', { class: 'g-pills' });
  const makePill = (label, value) => {
    const active = _filter.type === value;
    const p = el('button', { class: 'g-pill' + (active ? ' active' : ''), type: 'button' }, [label]);
    p.addEventListener('click', () => {
      _filter.type = _filter.type === value ? null : value;
      renderEjercicios(panel);
    });
    return p;
  };
  pills.appendChild(makePill('Todos', null));
  wrap.appendChild(pills);

  const listWrap = el('div', {});
  wrap.appendChild(listWrap);

  const addBtn = el('button', { class: 'g-add-cta', type: 'button' }, ['+ Crear ejercicio']);
  addBtn.addEventListener('click', () => showNewExerciseModal(() => renderEjercicios(panel)));
  wrap.appendChild(addBtn);
  panel.appendChild(wrap);

  // El directorio se carga UNA vez y se filtra en memoria. Antes cada tecla
  // disparaba dos dbGetAll completos (36 ejercicios + 559 sets y subiendo):
  // en el iPhone 11 eso se sentía como tirones al escribir.
  let _cache = null;
  const repaint = () => renderList(listWrap, panel, _cache);
  let _debounce = null;
  search.addEventListener('input', () => {
    _filter.search = search.value;
    clearTimeout(_debounce);
    _debounce = setTimeout(repaint, 120);
  });

  // UNA sola carga para las pastillas y para la lista. Antes se disparaban dos
  // Promise.all distintos que pedían `ejercicios` y `sesiones` por duplicado:
  // cinco lecturas completas de la DB para pintar una pantalla que necesita tres.
  guard(Promise.all([dbGetAll('ejercicios'), dbGetAll('sets'), dbGetAll('sesiones')]), 'cargando ejercicios')
    .then(([ejercicios, allSets, sesiones]) => {
      const names = new Set();
      ejercicios.forEach((e) => e.tipo && names.add(e.tipo));
      sesiones.forEach((s) => s.routine_type && names.add(s.routine_type));
      [...names].sort().forEach((t) => pills.appendChild(makePill(t, t)));

      _cache = { ejercicios, allSets, sesiones };
      repaint();
    });
  renderList(listWrap, panel, null);
}

function renderList(listEl, panel, data) {
  clear(listEl);
  if (!data) return; // aún cargando; repaint() lo pinta al llegar
  {
    const { ejercicios, allSets, sesiones } = data;
    // PR SOLO de sesiones finalizadas, igual que el detalle del ejercicio y
    // que todo el tab Progresión. Antes el directorio contaba también los sets
    // de la sesión en curso y mostraba un récord distinto en cada pantalla.
    const finalizadas = new Set(sesiones.filter((s) => s.finalizada === true).map((s) => s.id));
    const setsPorEj = new Map();
    allSets.forEach((s) => {
      if (!finalizadas.has(s.sesion_id)) return;
      const arr = setsPorEj.get(s.ejercicio_id);
      if (arr) arr.push(s); else setsPorEj.set(s.ejercicio_id, [s]);
    });
    const termKey = normalizeKey(_filter.search || '');
    const filtered = ejercicios.filter((e) => {
      if (_filter.type && e.tipo !== _filter.type) return false;
      if (termKey && normalizeKey(e.nombre).indexOf(termKey) < 0) return false;
      return true;
    });

    const groups = {};
    filtered.forEach((e) => {
      const t = e.tipo || 'Sin tipo';
      (groups[t] = groups[t] || []).push(e);
    });
    const keys = Object.keys(groups).sort((a, b) => {
      if (a === 'Sin tipo') return 1;
      if (b === 'Sin tipo') return -1;
      return a.localeCompare(b);
    });

    if (keys.length === 0) {
      listEl.appendChild(el('div', { class: 'g-empty-card', style: 'margin-top:24px;' }, ['Sin ejercicios. Crea el primero abajo.']));
      return;
    }

    keys.forEach((k) => {
      listEl.appendChild(el('div', { class: 'g-section-label' }, [k.toUpperCase()]));
      const card = el('div', { class: 'g-list-card' });
      groups[k].sort((a, b) => a.nombre.localeCompare(b.nombre)).forEach((e) => {
        const pr = weightPR(setsPorEj.get(e.id) || []);
        const bestStr = pr ? fmtWeight(pr.peso) + ' × ' + pr.reps : '—';
        const row = el('button', { class: 'g-list-row', type: 'button' }, [
          el('div', {}, [
            el('div', { class: 'g-list-name' }, [e.nombre]),
            el('div', { class: 'g-list-sub' }, [(e.musculos || []).join(' · ') || 'sin músculo'])
          ]),
          el('div', { class: 'g-list-right' }, [
            el('span', { class: 'g-list-pr' }, [bestStr]),
            el('span', { class: 'g-list-arrow' }, ['›'])
          ])
        ]);
        row.addEventListener('click', () => renderDetail(panel, e));
        card.appendChild(row);
      });
      listEl.appendChild(card);
    });
  }
}

function renderDetail(panel, ej) {
  clear(panel);
  const wrap = el('div', { class: 'g-detail-screen' });
  const back = el('button', { class: 'g-back-inline', type: 'button' }, ['Ejercicios']);
  back.addEventListener('click', () => renderEjercicios(panel));
  wrap.appendChild(back);
  wrap.appendChild(el('h2', { class: 'g-detail-title' }, [ej.nombre]));
  wrap.appendChild(el('div', { class: 'g-detail-sub' }, [(ej.musculos || []).join(' · ') || 'sin músculo']));

  const sesCount = el('div', { class: 'g-info-value' }, ['—']);
  const restValue = el('div', { class: 'g-info-value' }, [ej.rest_sec ? ej.rest_sec + 's' : 'default']);
  wrap.appendChild(el('div', { class: 'g-info-grid' }, [
    el('div', { class: 'g-info-item' }, [
      el('div', { class: 'g-info-label' }, ['RUTINA']),
      el('div', { class: 'g-info-value' }, [ej.tipo || 'Sin tipo'])
    ]),
    el('div', { class: 'g-info-item' }, [
      el('div', { class: 'g-info-label' }, ['SESIONES']),
      sesCount
    ]),
    el('div', { class: 'g-info-item' }, [
      el('div', { class: 'g-info-label' }, ['DESCANSO']),
      restValue
    ])
  ]));
  // El descanso por defecto solo se podía tocar DENTRO de una sesión activa:
  // aquí se mostraba pero no se podía cambiar.
  guard(prefGet('rest_default', 90), 'descanso por defecto').then((def) => {
    if (!ej.rest_sec) restValue.textContent = def + 's (global)';
  });

  const editBtn = el('button', { class: 'g-edit-muscles', type: 'button' }, ['✏️ Editar músculos']);
  editBtn.addEventListener('click', () => {
    openEditMusclesModal(ej, (updated) => renderDetail(panel, updated));
  });
  wrap.appendChild(editBtn);

  const renameBtn = el('button', { class: 'g-edit-muscles', type: 'button' }, ['✏️ Renombrar / cambiar rutina']);
  renameBtn.addEventListener('click', () => {
    openRenameModal(ej, (updated) => renderDetail(panel, updated));
  });
  wrap.appendChild(renameBtn);

  const restBtn = el('button', { class: 'g-edit-muscles', type: 'button' }, ['⏱ Descanso de este ejercicio']);
  restBtn.addEventListener('click', () => {
    openRestModal(ej, (updated) => renderDetail(panel, updated));
  });
  wrap.appendChild(restBtn);

  wrap.appendChild(el('div', { class: 'g-section-label', style: 'padding-left:20px;' }, ['HISTORIAL']));
  const listWrap = el('div', { style: 'padding:0 16px;' });
  wrap.appendChild(listWrap);
  panel.appendChild(wrap);

  guard(Promise.all([dbGetAllBy('sets', 'ejercicio_id', ej.id), dbGetAll('sesiones')]), 'cargando historial')
    .then(([sets, sesiones]) => {
      const sesMap = {};
      sesiones.forEach((s) => { sesMap[s.id] = s; });
      const countable = sets.filter(isCountable).filter((s) => {
        const ses = sesMap[s.sesion_id];
        return ses && ses.finalizada === true;
      });
      const bySesion = {};
      countable.forEach((st) => { (bySesion[st.sesion_id] = bySesion[st.sesion_id] || []).push(st); });
      sesCount.textContent = String(Object.keys(bySesion).length);
      if (countable.length === 0) {
        listWrap.appendChild(el('div', { class: 'g-empty-card' }, ['Sin registros aún para este ejercicio.']));
        return;
      }
      const rows = Object.keys(bySesion).map((sid) => {
        const sesion = sesMap[sid];
        const arr = bySesion[sid];
        return { sesion, ts: sessionTs(sesion), count: arr.length, best: weightPR(arr) };
      }).sort((a, b) => b.ts - a.ts);
      const card = el('div', { class: 'g-list-card' });
      rows.forEach((r) => {
        card.appendChild(el('div', { class: 'g-list-row', style: 'cursor:default;' }, [
          el('div', {}, [
            el('div', { class: 'g-list-name' }, [fmtDateLong(r.sesion ? r.sesion.fecha : null)]),
            el('div', { class: 'g-list-sub' }, [(r.sesion && r.sesion.routine_type) || 'Sin rutina'])
          ]),
          el('span', { class: 'g-list-pr' }, [
            r.count + ' sets · mejor ' + fmtWeight(r.best.peso) + ' × ' + r.best.reps
          ])
        ]));
      });
      listWrap.appendChild(card);
    });
}

// ─── Renombrar / cambiar rutina ───────────────────────────────────────────────
function openRenameModal(ej, onSaved) {
  const s = sheet('Editar ejercicio');
  s.modal.appendChild(el('div', { class: 'g-modal-sub' }, ['Nombre']));
  const nameInput = el('input', { class: 'g-modal-input', type: 'text', value: ej.nombre });
  s.modal.appendChild(nameInput);
  s.modal.appendChild(el('div', { class: 'g-modal-sub', style: 'margin-top:14px;' }, ['Rutina']));
  const typeInput = el('input', {
    class: 'g-modal-input', type: 'text', autocomplete: 'off',
    placeholder: 'Ej. Upper, Push, Leg Day…', value: ej.tipo || ''
  });
  s.modal.appendChild(typeInput);
  const typeSugg = el('div', { class: 'g-suggest' });
  s.modal.appendChild(typeSugg);
  guard(Promise.all([dbGetAll('sesiones'), dbGetAll('ejercicios')]), 'rutinas').then(([ses, ejs]) => {
    const names = new Set();
    ses.forEach((x) => x.routine_type && names.add(x.routine_type));
    ejs.forEach((x) => x.tipo && names.add(x.tipo));
    attachSuggest(typeInput, typeSugg, () => [...names].sort(), (n) => { typeInput.value = n; }, normalizeKey);
  });

  const save = el('button', { class: 'g-btn-primary', type: 'button' }, ['Guardar cambios']);
  once(save, () => {
    const nombre = nameInput.value.trim();
    if (!nombre) { toast('Nombre requerido'); return null; }
    const prev = { nombre: ej.nombre, tipo: ej.tipo };
    ej.nombre = nombre;
    ej.tipo = typeInput.value.trim() || null;
    return dbPut('ejercicios', ej).then(() => {
      s.close();
      toast('Ejercicio actualizado');
      if (onSaved) onSaved(ej);
    }).catch((err) => {
      ej.nombre = prev.nombre;
      ej.tipo = prev.tipo;
      // El índice `nombre` es unique: ese es el único error esperable aquí.
      toast(err && err.name === 'ConstraintError'
        ? 'Ya existe un ejercicio con ese nombre'
        : 'Error guardando el ejercicio');
    });
  });
  s.modal.appendChild(save);
  s.open();
}

// ─── Descanso por ejercicio + default global ──────────────────────────────────
function openRestModal(ej, onSaved) {
  const s = sheet('Descanso · ' + ej.nombre);
  const readVal = (input, permitirVacio) => {
    const raw = String(input.value || '').trim();
    if (!raw && permitirVacio) return null;
    const v = parseInt(raw, 10);
    if (!(v >= 10 && v <= 3600)) { toast('Entre 10 y 3600 segundos'); return NaN; }
    return v;
  };

  s.modal.appendChild(el('div', { class: 'g-modal-sub' }, ['Descanso de este ejercicio (s)']));
  const ejInput = el('input', {
    class: 'g-modal-input', type: 'number', inputmode: 'numeric',
    placeholder: 'Vacío = usar el global', value: ej.rest_sec ? String(ej.rest_sec) : ''
  });
  s.modal.appendChild(ejInput);
  const saveEj = el('button', { class: 'g-btn-primary', type: 'button' }, ['Guardar para este ejercicio']);
  once(saveEj, () => {
    const v = readVal(ejInput, true);
    if (Number.isNaN(v)) return null;
    ej.rest_sec = v;
    return guard(dbPut('ejercicios', ej), 'guardando descanso').then(() => {
      s.close();
      toast(v == null ? 'Usará el descanso global' : 'Descanso: ' + v + 's');
      if (onSaved) onSaved(ej);
    });
  });
  s.modal.appendChild(saveEj);

  s.modal.appendChild(el('div', { class: 'g-modal-sub', style: 'margin-top:20px;' }, ['Descanso global por defecto (s)']));
  const defInput = el('input', { class: 'g-modal-input', type: 'number', inputmode: 'numeric', placeholder: '90' });
  s.modal.appendChild(defInput);
  s.modal.appendChild(el('div', { class: 'g-modal-body', style: 'margin-top:8px;' }, [
    'Se aplica a todos los ejercicios que no tengan un descanso propio.'
  ]));
  guard(prefGet('rest_default', 90), 'descanso por defecto').then((d) => { defInput.value = String(d); });
  const saveDef = el('button', { class: 'g-btn-secondary', type: 'button' }, ['Guardar descanso global']);
  once(saveDef, () => {
    const v = readVal(defInput, false);
    if (v == null || Number.isNaN(v)) return null;
    return guard(prefSet('rest_default', v), 'guardando descanso global').then(() => {
      s.close();
      toast('Descanso global: ' + v + 's');
      if (onSaved) onSaved(ej);
    });
  });
  s.modal.appendChild(saveDef);
  s.open();
}

// ─── Muscle picker (reutilizable) ─────────────────────────────────────────────
// LISTA CERRADA a propósito. Antes había un buscador con "Crear «X»" y además se
// añadían al vuelo los músculos descubiertos en la base: así nacieron 'Aductor'
// junto a 'Aductores' y 'Trapecio' junto a 'Trapecios', dos filas casi idénticas
// en el selector que Esteban reportó como músculos duplicados y raros. Con 18
// músculos caben todos en pantalla agrupados y no hace falta ni buscar ni crear.
// Si de verdad falta un músculo, se añade a `js/muscles.js` — y solo ahí.
export function buildMusclePicker(opts = {}) {
  const selected = new Set();
  (opts.initialSelected || []).filter(Boolean).forEach((m) => {
    // Lo que venga del historial se traduce a la taxonomía al vuelo, para que
    // abrir el editor de un ejercicio viejo no muestre nombres que ya no existen.
    const c = canonicalMuscle(m);
    if (c) selected.add(c);
  });

  const wrap = el('div', { class: 'g-muscle-picker' });
  const onChange = typeof opts.onChange === 'function' ? opts.onChange : null;
  const botones = new Map();

  MUSCLE_GROUPS.forEach((g) => {
    wrap.appendChild(el('div', { class: 'g-muscle-group-label' }, [g.grupo]));
    const fila = el('div', { class: 'g-muscle-chips' });
    g.musculos.forEach((m) => {
      const b = el('button', {
        type: 'button',
        class: 'g-muscle-chip' + (selected.has(m) ? ' on' : ''),
        'aria-pressed': selected.has(m) ? 'true' : 'false'
      }, [m]);
      b.addEventListener('click', () => {
        if (selected.has(m)) selected.delete(m); else selected.add(m);
        b.classList.toggle('on', selected.has(m));
        b.setAttribute('aria-pressed', selected.has(m) ? 'true' : 'false');
        if (onChange) onChange(getSelected());
      });
      botones.set(m, b);
      fila.appendChild(b);
    });
    wrap.appendChild(fila);
  });

  // Orden estable por la taxonomía, no por orden de toque: dos ejercicios con
  // los mismos músculos deben mostrarlos siempre igual.
  const getSelected = () => MUSCLES.filter((m) => selected.has(m));

  return { container: wrap, getSelected };
}

// ─── Crear ejercicio (compartido con Entrenar) ────────────────────────────────
export function showNewExerciseModal(onCreated, defaultRoutine) {
  const s = sheet('Crear ejercicio');
  s.modal.appendChild(el('div', { class: 'g-modal-sub' }, ['Nombre']));
  const nameInput = el('input', { class: 'g-modal-input', type: 'text', placeholder: 'Nombre del ejercicio' });
  s.modal.appendChild(nameInput);

  s.modal.appendChild(el('div', { class: 'g-modal-sub' }, ['Rutina']));
  const typeInput = el('input', {
    class: 'g-modal-input', type: 'text', placeholder: 'Ej. Upper, Push, Leg Day…',
    autocomplete: 'off', value: defaultRoutine || ''
  });
  s.modal.appendChild(typeInput);
  const typeSugg = el('div', { class: 'g-suggest' });
  s.modal.appendChild(typeSugg);
  guard(Promise.all([dbGetAll('sesiones'), dbGetAll('ejercicios')]), 'rutinas').then(([ses, ejs]) => {
    const names = new Set();
    ses.forEach((x) => x.routine_type && names.add(x.routine_type));
    ejs.forEach((x) => x.tipo && names.add(x.tipo));
    attachSuggest(typeInput, typeSugg, () => [...names].sort(), (n) => { typeInput.value = n; }, normalizeKey);
  });

  s.modal.appendChild(el('div', { class: 'g-modal-sub' }, ['Músculos']));
  const picker = buildMusclePicker({ initialSelected: [] });
  s.modal.appendChild(picker.container);

  s.modal.appendChild(el('div', { class: 'g-modal-sub', style: 'margin-top:12px;' }, ['Descanso (s) · opcional']));
  const restInput = el('input', {
    class: 'g-modal-input', type: 'number', inputmode: 'numeric', placeholder: 'Vacío = default (90s)'
  });
  s.modal.appendChild(restInput);

  const createBtn = el('button', { class: 'g-btn-primary', type: 'button' }, ['Crear ejercicio']);
  once(createBtn, () => {
    const nombre = nameInput.value.trim();
    if (!nombre) { toast('Nombre requerido'); return null; }
    const muscles = picker.getSelected();
    if (muscles.length === 0) { toast('Selecciona al menos un músculo'); return null; }
    const rest = parseInt(restInput.value, 10);
    const record = {
      nombre,
      musculos: muscles,
      tipo: typeInput.value.trim() || null,
      rest_sec: rest > 0 ? rest : null,
      fecha_creacion: new Date().toISOString()
    };
    return dbPut('ejercicios', record).then((id) => {
      record.id = id;
      s.close();
      toast('Ejercicio creado');
      if (onCreated) onCreated(record);
    }).catch((err) => {
      // Antes CUALQUIER fallo se reportaba como nombre duplicado. El índice
      // `nombre` es unique, así que solo ConstraintError significa eso.
      console.error('[gym-tracker] creando ejercicio', err);
      toast(err && err.name === 'ConstraintError'
        ? 'Ya existe un ejercicio con ese nombre'
        : 'Error creando el ejercicio');
    });
  });
  s.modal.appendChild(createBtn);
  s.open();
  setTimeout(() => nameInput.focus(), 80);
}

// Exportado: durante la rutina también se pueden cambiar los músculos de un
// ejercicio, sin salir del entrenamiento (pedido de Esteban 2026-08-12).
export function openEditMusclesModal(ej, onSaved) {
  const s = sheet('Editar músculos');
  s.modal.appendChild(el('div', { class: 'g-modal-sub', style: 'margin-top:0;' }, [ej.nombre]));
  const picker = buildMusclePicker({ initialSelected: ej.musculos || [] });
  s.modal.appendChild(picker.container);
  s.modal.appendChild(el('div', { class: 'g-modal-body', style: 'margin-top:14px;' }, [
    'Los músculos son del ejercicio, no de la sesión: cambiarlos recalcula el volumen por músculo de tu historial.'
  ]));
  const save = el('button', { class: 'g-btn-primary', type: 'button' }, ['Guardar cambios']);
  once(save, () => {
    const muscles = picker.getSelected();
    if (muscles.length === 0) { toast('Selecciona al menos un músculo'); return null; }
    ej.musculos = muscles;
    return guard(dbPut('ejercicios', ej), 'guardando músculos').then(() => {
      s.close();
      toast('Músculos actualizados');
      if (onSaved) onSaved(ej);
    });
  });
  s.modal.appendChild(save);
  s.open();
}
