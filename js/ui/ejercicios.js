// ejercicios.js — Tab 2: Plantillas y directorio de ejercicios.
//
// Arriba, un control segmentado Plantillas | Ejercicios (el control estándar de
// iOS para cambiar de vista dentro de una pestaña). Pedido de Esteban
// (2026-11-16): la pestaña estaba desordenada y las plantillas necesitaban un
// lugar propio donde verlas todas, crearlas, editarlas y borrarlas.

import { el, clear, toast, guard } from '../dom.js';
import { dbGetAll, dbGetAllBy, dbPut, prefGet, prefSet } from '../db.js';
import { fmtWeight, fmtDateLong, normalizeKey } from '../format.js';
import { weightPR, isCountable, sessionTs } from '../stats.js';
import { ICON, backButton } from './icons.js';
import { sheet, once, hideKeyboardOnDrag } from './modals.js';
import { MUSCLE_GROUPS, MUSCLES, canonicalMuscle, exerciseGroup } from '../muscles.js';
import { TEMPLATES_PREF, templatesWithExercise } from '../templates.js';
import { renderTemplatesView } from './plantillas.js';

// Se recuerda mientras la app está abierta: volver a la pestaña te deja donde
// estabas. Arranca en Plantillas: es lo que se edita; el directorio se consulta.
let _vista = 'plantillas';
const _filter = { group: null, search: '' };
const SIN_GRUPO = 'Sin músculo';

export function renderEjercicios(panel) {
  clear(panel);
  const wrap = el('div', { class: 'g-lib' });

  const seg = el('div', { class: 'g-seg g-lib-seg', role: 'group', 'aria-label': 'Qué ver' });
  const contenido = el('div', {});
  const vistas = [['plantillas', 'Plantillas'], ['ejercicios', 'Ejercicios']];
  const botones = vistas.map(([id, label]) => {
    const b = el('button', { type: 'button', class: id === _vista ? 'active' : '', 'aria-pressed': String(id === _vista) }, [label]);
    b.addEventListener('click', () => {
      if (_vista === id) return;
      _vista = id;
      botones.forEach((x, i) => {
        const on = vistas[i][0] === id;
        x.classList.toggle('active', on);
        x.setAttribute('aria-pressed', String(on));
      });
      pintarVista();
    });
    return b;
  });
  botones.forEach((b) => seg.appendChild(b));
  wrap.appendChild(seg);
  wrap.appendChild(contenido);
  panel.appendChild(wrap);

  function pintarVista() {
    clear(contenido);
    window.scrollTo(0, 0);
    return _vista === 'plantillas'
      ? renderTemplatesView(contenido, () => renderEjercicios(panel))
      : renderDirectory(contenido, panel);
  }
  // La cadena se DEVUELVE: `main.js` la espera para revelar el tab ya lleno en
  // vez de enseñarlo vacío mientras IndexedDB contesta (ver renderEntrenar).
  return pintarVista();
}

// ─── Directorio ───────────────────────────────────────────────────────────────
// Agrupado por grupo muscular (Empuje · Tirón · Core · Pierna), calculado de los
// músculos de cada ejercicio (muscles.js › exerciseGroup). Antes se agrupaba
// por la etiqueta vieja `tipo` (Legs/Pull/Push/Upper), que estaba mal en muchos
// ejercicios: Cable Crunches y Shrugs aparecían dentro de LEGS. `tipo` sigue en
// los datos (no se borra nada), pero ya no se muestra ni se edita.
function renderDirectory(container, panel) {
  const searchWrap = el('div', { class: 'g-search-wrap' });
  searchWrap.appendChild(ICON.search({ size: 17, class: 'g-search-icon' }));
  const search = el('input', { class: 'g-search', type: 'text', placeholder: 'Buscar ejercicio…', value: _filter.search || '' });
  searchWrap.appendChild(search);
  container.appendChild(searchWrap);

  const pills = el('div', { class: 'g-pills' });
  const listWrap = el('div', {});
  let _cache = null;
  const repaint = () => renderList(listWrap, panel, _cache);
  const pillEls = [];
  const makePill = (label, value) => {
    const p = el('button', { class: 'g-pill' + (_filter.group === value ? ' active' : ''), type: 'button' }, [label]);
    p.addEventListener('click', () => {
      _filter.group = value;
      pillEls.forEach((x) => x.el.classList.toggle('active', x.value === value));
      repaint();
    });
    pillEls.push({ el: p, value });
    return p;
  };
  pills.appendChild(makePill('Todos', null));
  MUSCLE_GROUPS.forEach((g) => pills.appendChild(makePill(g.grupo, g.grupo)));
  container.appendChild(pills);
  container.appendChild(listWrap);

  const addBtn = el('button', { class: 'g-add-cta', type: 'button' }, ['+ Crear ejercicio']);
  addBtn.addEventListener('click', () => showNewExerciseModal(() => renderEjercicios(panel)));
  container.appendChild(addBtn);

  // El directorio se carga UNA vez y se filtra en memoria. Antes cada tecla
  // disparaba dos dbGetAll completos (36 ejercicios + 559 sets y subiendo):
  // en el iPhone 11 eso se sentía como tirones al escribir.
  let _debounce = null;
  search.addEventListener('input', () => {
    _filter.search = search.value;
    clearTimeout(_debounce);
    _debounce = setTimeout(repaint, 120);
  });

  return guard(Promise.all([dbGetAll('ejercicios'), dbGetAll('sets'), dbGetAll('sesiones')]), 'cargando ejercicios')
    .then(([ejercicios, allSets, sesiones]) => {
      _cache = { ejercicios, allSets, sesiones };
      repaint();
    });
}

function renderList(listEl, panel, data) {
  clear(listEl);
  if (!data) return; // aún cargando; repaint() lo pinta al llegar
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
  const groups = {};
  ejercicios.forEach((e) => {
    const g = exerciseGroup(e.musculos) || SIN_GRUPO;
    if (_filter.group && g !== _filter.group) return;
    if (termKey && normalizeKey(e.nombre).indexOf(termKey) < 0) return;
    (groups[g] = groups[g] || []).push(e);
  });
  const keys = MUSCLE_GROUPS.map((g) => g.grupo).concat([SIN_GRUPO]).filter((k) => groups[k]);

  if (keys.length === 0) {
    listEl.appendChild(el('div', { class: 'g-empty-card', style: 'margin-top:24px;' }, [
      ejercicios.length ? 'Ningún ejercicio coincide.' : 'Sin ejercicios. Crea el primero abajo.'
    ]));
    return;
  }

  keys.forEach((k) => {
    listEl.appendChild(el('div', { class: 'g-section-label' }, [k.toUpperCase()]));
    const card = el('div', { class: 'g-list-card' });
    groups[k].sort((a, b) => a.nombre.localeCompare(b.nombre)).forEach((e) => {
      const pr = weightPR((setsPorEj.get(e.id) || []).filter(isCountable));
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

// ─── Ficha del ejercicio ──────────────────────────────────────────────────────
// Lista agrupada al estilo de Ajustes de iOS (etiqueta, valor debajo, ›), en vez
// de tres botones punteados con lápices: cada fila dice qué vale hoy y qué abre.
function renderDetail(panel, ej) {
  clear(panel);
  window.scrollTo(0, 0);
  const wrap = el('div', { class: 'g-detail-screen' });
  const back = backButton();
  back.addEventListener('click', () => renderEjercicios(panel));
  wrap.appendChild(back);
  wrap.appendChild(el('h2', { class: 'g-detail-title' }, [ej.nombre]));
  wrap.appendChild(el('div', { class: 'g-detail-sub' }, [exerciseGroup(ej.musculos) || SIN_GRUPO]));

  const sesCount = el('div', { class: 'g-info-value' }, ['—']);
  const bestValue = el('div', { class: 'g-info-value' }, ['—']);
  wrap.appendChild(el('div', { class: 'g-info-grid g-info-grid-2' }, [
    el('div', { class: 'g-info-item' }, [el('div', { class: 'g-info-label' }, ['SESIONES']), sesCount]),
    el('div', { class: 'g-info-item' }, [el('div', { class: 'g-info-label' }, ['MEJOR']), bestValue])
  ]));

  const restSub = el('div', { class: 'g-list-sub' }, ['…']);
  const plantillasSub = el('div', { class: 'g-list-sub' }, ['…']);
  const fila = (nombre, sub, onClick) => {
    const row = el('button', { class: 'g-list-row', type: 'button' }, [
      el('div', { class: 'g-detail-row-text' }, [el('div', { class: 'g-list-name' }, [nombre]), sub]),
      el('span', { class: 'g-list-arrow' }, ['›'])
    ]);
    row.addEventListener('click', onClick);
    return row;
  };
  const reabrir = (updated) => renderDetail(panel, updated);
  const card = el('div', { class: 'g-list-card g-detail-card' }, [
    fila('Nombre', el('div', { class: 'g-list-sub' }, [ej.nombre]), () => openRenameModal(ej, reabrir)),
    fila('Músculos', el('div', { class: 'g-list-sub' }, [(ej.musculos || []).join(' · ') || 'sin músculo']),
      () => openEditMusclesModal(ej, reabrir)),
    fila('Descanso', restSub, () => openRestModal(ej, reabrir)),
    el('div', { class: 'g-list-row', style: 'cursor:default;' }, [
      el('div', { class: 'g-detail-row-text' }, [el('div', { class: 'g-list-name' }, ['Plantillas']), plantillasSub])
    ])
  ]);
  wrap.appendChild(card);

  // El descanso por defecto solo se podía tocar DENTRO de una sesión activa:
  // aquí se mostraba pero no se podía cambiar.
  guard(Promise.all([prefGet('rest_default', 90), prefGet(TEMPLATES_PREF, [])]), 'datos del ejercicio')
    .then(([def, plantillas]) => {
      restSub.textContent = ej.rest_sec ? ej.rest_sec + ' s (propio)' : def + ' s (el general)';
      const en = templatesWithExercise(plantillas, ej.id);
      plantillasSub.textContent = en.length ? en.join(' · ') : 'No está en ninguna plantilla';
    });

  wrap.appendChild(el('div', { class: 'g-section-label', style: 'padding-left:20px;' }, ['HISTORIAL']));
  const listWrap = el('div', { style: 'padding:0 16px;' });
  wrap.appendChild(listWrap);
  panel.appendChild(wrap);

  return guard(Promise.all([dbGetAllBy('sets', 'ejercicio_id', ej.id), dbGetAll('sesiones')]), 'cargando historial')
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
      const pr = weightPR(countable);
      if (pr) bestValue.textContent = fmtWeight(pr.peso) + ' × ' + pr.reps;
      if (countable.length === 0) {
        listWrap.appendChild(el('div', { class: 'g-empty-card' }, ['Sin registros aún para este ejercicio.']));
        return;
      }
      const rows = Object.keys(bySesion).map((sid) => {
        const sesion = sesMap[sid];
        const arr = bySesion[sid];
        return { sesion, ts: sessionTs(sesion), count: arr.length, best: weightPR(arr) };
      }).sort((a, b) => b.ts - a.ts);
      const hist = el('div', { class: 'g-list-card' });
      rows.forEach((r) => {
        hist.appendChild(el('div', { class: 'g-list-row', style: 'cursor:default;' }, [
          el('div', {}, [
            el('div', { class: 'g-list-name' }, [fmtDateLong(r.sesion ? r.sesion.fecha : null)]),
            el('div', { class: 'g-list-sub' }, [(r.sesion && r.sesion.routine_type) || 'Sin rutina'])
          ]),
          el('span', { class: 'g-list-pr' }, [
            r.count + (r.count === 1 ? ' set' : ' sets') + ' · mejor ' + fmtWeight(r.best.peso) + ' × ' + r.best.reps
          ])
        ]));
      });
      listWrap.appendChild(hist);
    });
}

// ─── Renombrar ────────────────────────────────────────────────────────────────
// Antes este sheet también cambiaba la "rutina" del ejercicio (la etiqueta vieja
// `tipo`). Ya no se muestra en ningún lado: qué ejercicios van en cada rutina lo
// dice su plantilla.
function openRenameModal(ej, onSaved) {
  const s = sheet('Nombre del ejercicio');
  const nameInput = el('input', { class: 'g-modal-input', type: 'text', value: ej.nombre });
  s.modal.appendChild(nameInput);
  s.modal.appendChild(el('div', { class: 'g-modal-body', style: 'margin-top:8px;' }, [
    'Tu historial y tus plantillas siguen apuntando a este ejercicio aunque cambie el nombre.'
  ]));

  const save = el('button', { class: 'g-btn-primary', type: 'button' }, ['Guardar']);
  once(save, () => {
    const nombre = nameInput.value.trim();
    if (!nombre) { toast('Nombre requerido'); return null; }
    const prev = ej.nombre;
    ej.nombre = nombre;
    return dbPut('ejercicios', ej).then(() => {
      s.close();
      toast('Ejercicio actualizado');
      if (onSaved) onSaved(ej);
    }).catch((err) => {
      ej.nombre = prev;
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
export function showNewExerciseModal(onCreated) {
  const s = sheet('Crear ejercicio');
  s.modal.appendChild(el('div', { class: 'g-modal-sub' }, ['Nombre']));
  const nameInput = el('input', { class: 'g-modal-input', type: 'text', placeholder: 'Nombre del ejercicio' });
  s.modal.appendChild(nameInput);

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
      tipo: null,
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

// ─── Elegir un ejercicio del directorio (compartido) ──────────────────────────
// La misma hoja para "Agregar ejercicio" en la sesión y para agregar a una
// plantilla: buscador arriba, directorio entero sin teclear, "Crear ejercicio
// nuevo" abajo. Una sola forma de elegir un ejercicio en toda la app.
//   featured: { label, test(e) } — sección que va primero (null = ninguna)
//   disabled: Set de ids que no se pueden elegir (ya están), se ven apagados
//   onPick(e), onCreate() — la hoja ya se cerró cuando se llaman
export function pickExercise({ title, featured = null, disabled = null, onPick, onCreate }) {
  const s = sheet(title, { picker: true });
  const searchWrap = el('div', { class: 'g-search-wrap' });
  searchWrap.appendChild(ICON.search({ size: 17, class: 'g-search-icon' }));
  const search = el('input', {
    class: 'g-search', type: 'text', placeholder: 'Buscar ejercicio…',
    autocomplete: 'off', autocorrect: 'off', enterkeyhint: 'search'
  });
  searchWrap.appendChild(search);
  s.modal.appendChild(searchWrap);
  const sugg = el('div', { class: 'g-suggest' });
  s.modal.appendChild(sugg);
  hideKeyboardOnDrag(sugg, search);
  const newBtn = el('button', { class: 'g-btn-secondary', type: 'button' }, ['+ Crear ejercicio nuevo']);
  newBtn.addEventListener('click', () => { s.close(); onCreate(); });
  s.modal.appendChild(newBtn);

  guard(dbGetAll('ejercicios'), 'cargando directorio').then((all) => {
    const byName = (a, b) => a.nombre.localeCompare(b.nombre);
    const row = (e) => {
      const ya = disabled && disabled.has(e.id);
      const item = el('button', { class: 'g-suggest-row' + (ya ? ' dim' : ''), type: 'button' }, [
        el('b', {}, [e.nombre]),
        el('div', { class: 'g-suggest-meta' }, [ya ? 'Ya está' : ((e.musculos || []).join(' · ') || 'sin músculo')])
      ]);
      item.addEventListener('click', () => {
        if (ya) { toast(e.nombre + ' ya está'); return; }
        s.close();
        onPick(e);
      });
      return item;
    };
    // Sin texto se ve el directorio entero: antes decía "Escribe para buscar" y
    // obligaba a abrir el teclado para algo que se elige de un toque.
    function render(term) {
      clear(sugg);
      sugg.scrollTop = 0;
      const tKey = normalizeKey((term || '').trim());
      if (!tKey) {
        const primero = featured ? all.filter(featured.test).sort(byName) : [];
        const resto = all.filter((e) => primero.indexOf(e) < 0).sort(byName);
        if (primero.length) {
          sugg.appendChild(el('div', { class: 'g-suggest-section' }, [featured.label]));
          primero.forEach((e) => sugg.appendChild(row(e)));
          if (resto.length) sugg.appendChild(el('div', { class: 'g-suggest-section' }, ['Otros']));
        }
        resto.forEach((e) => sugg.appendChild(row(e)));
        if (!all.length) sugg.appendChild(el('div', { class: 'g-suggest-empty' }, ['Aún no hay ejercicios. Crea el primero.']));
        return;
      }
      // Primero los que EMPIEZAN por lo escrito, luego los que lo contienen.
      const filtered = all
        .filter((e) => normalizeKey(e.nombre).indexOf(tKey) >= 0)
        .sort((a, b) => (normalizeKey(a.nombre).indexOf(tKey) === 0 ? 0 : 1) - (normalizeKey(b.nombre).indexOf(tKey) === 0 ? 0 : 1) || byName(a, b));
      if (filtered.length === 0) {
        sugg.appendChild(el('div', { class: 'g-suggest-empty' }, ['Sin coincidencias. Usa "Crear ejercicio nuevo".']));
        return;
      }
      filtered.forEach((e) => sugg.appendChild(row(e)));
    }
    render('');
    search.addEventListener('input', () => render(search.value));
  });

  s.open();
}
