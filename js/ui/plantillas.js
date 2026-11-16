// plantillas.js — Plantillas fijas por rutina: la lista (vista "Plantillas" de
// la pestaña Ejercicios) y el editor. La lógica pura vive en js/templates.js.
//
// Decisiones de Esteban (2026-11-16):
//   · Cada rutina tiene UNA plantilla con sus ejercicios y su orden. Pesos y sets
//     no: cambian cada día.
//   · Se editan SOLO aquí. Quitar un ejercicio con la caneca durante una sesión
//     no toca la plantilla.
//   · Las crea él, una por una, eligiendo los ejercicios.

import { el, clear, toast, guard } from '../dom.js';
import { dbGetAll, prefGet, prefSet } from '../db.js';
import { normalizeKey, fmtDateShort } from '../format.js';
import { sessionTs } from '../stats.js';
import { sheet, confirmAction, once } from './modals.js';
import { enableDragOrder } from './dragorder.js';
import { ICON } from './icons.js';
import { pickExercise, showNewExerciseModal } from './ejercicios.js';
import {
  TEMPLATES_PREF, sanitizeTemplates, sortTemplates, saveTemplate, deleteTemplate, cleanTemplateName
} from '../templates.js';

// ─── Lista ────────────────────────────────────────────────────────────────────
// DEVUELVE una promesa (patrón de las pestañas): resuelve con la lista pintada.
export function renderTemplatesView(container, onChanged) {
  return guard(Promise.all([prefGet(TEMPLATES_PREF, []), dbGetAll('ejercicios'), dbGetAll('sesiones')]), 'cargando plantillas')
    .then(([raw, ejercicios, sesiones]) => {
      const plantillas = sortTemplates(sanitizeTemplates(raw));
      const ejMap = {};
      ejercicios.forEach((e) => { ejMap[e.id] = e; });
      const ultima = lastDoneByRoutine(sesiones);

      if (plantillas.length === 0) {
        container.appendChild(el('div', { class: 'g-empty-card g-tpl-empty' }, [
          el('div', { class: 'g-list-name' }, ['Aún no tienes plantillas']),
          el('div', { class: 'g-list-sub', style: 'margin-top:6px;' }, [
            'Una plantilla fija los ejercicios y el orden de una rutina. Al empezar esa ' +
            'rutina se cargan todos, aunque la última vez te hayas saltado alguno.'
          ])
        ]));
      } else {
        container.appendChild(el('div', { class: 'g-section-label' }, ['TUS RUTINAS']));
        const card = el('div', { class: 'g-list-card' });
        plantillas.forEach((t) => {
          const nombres = t.ejercicios.map((id) => ejMap[id] && ejMap[id].nombre).filter(Boolean);
          const fecha = ultima.get(normalizeKey(t.nombre));
          const row = el('button', { class: 'g-list-row', type: 'button' }, [
            el('div', { class: 'g-tpl-row-text' }, [
              el('div', { class: 'g-list-name' }, [t.nombre]),
              el('div', { class: 'g-list-sub g-tpl-preview' }, [nombres.join(' · ') || 'Sin ejercicios']),
              el('div', { class: 'g-list-sub' }, [
                nombres.length + (nombres.length === 1 ? ' ejercicio' : ' ejercicios') +
                ' · ' + (fecha ? 'última vez ' + fmtDateShort(fecha) : 'aún no la haces')
              ])
            ]),
            el('span', { class: 'g-list-arrow' }, ['›'])
          ]);
          row.addEventListener('click', () => openTemplateEditor(t.nombre, onChanged));
          card.appendChild(row);
        });
        container.appendChild(card);
      }

      const add = el('button', { class: 'g-add-cta', type: 'button' }, ['+ Nueva plantilla']);
      add.addEventListener('click', () => openTemplateEditor(null, onChanged));
      container.appendChild(add);
    });
}

// Fecha de la última sesión finalizada de cada rutina (clave normalizada).
function lastDoneByRoutine(sesiones) {
  const m = new Map();
  sesiones.forEach((s) => {
    if (s.finalizada !== true || !s.routine_type) return;
    const k = normalizeKey(s.routine_type);
    const prev = m.get(k);
    if (!prev || sessionTs(s) > prev.ts) m.set(k, { ts: sessionTs(s), fecha: s.fecha });
  });
  const out = new Map();
  m.forEach((v, k) => out.set(k, v.fecha));
  return out;
}

// ─── Editor ───────────────────────────────────────────────────────────────────
// `nombre` = plantilla existente, o null para una nueva. Se trabaja sobre una
// COPIA: nada se guarda hasta tocar "Guardar plantilla", así cerrar la hoja
// equivale a cancelar.
export function openTemplateEditor(nombre, onSaved) {
  guard(Promise.all([prefGet(TEMPLATES_PREF, []), dbGetAll('ejercicios'), dbGetAll('sesiones')]), 'abriendo plantilla')
    .then(([raw, ejercicios, sesiones]) => {
      const plantillas = sanitizeTemplates(raw);
      const original = nombre ? plantillas.find((t) => normalizeKey(t.nombre) === normalizeKey(nombre)) : null;
      const ejMap = {};
      ejercicios.forEach((e) => { ejMap[e.id] = e; });
      const ids = original ? original.ejercicios.filter((id) => ejMap[id]) : [];

      const s = sheet(original ? 'Editar plantilla' : 'Nueva plantilla');

      // Nombre de la rutina. Las rutinas que ya has hecho y aún no tienen
      // plantilla se ELIGEN de una lista: escribir "Upper A" a mano permite que
      // nazca una "Upper A " distinta y que la plantilla nunca se cargue.
      s.modal.appendChild(el('div', { class: 'g-modal-sub', style: 'margin-top:0;' }, ['Rutina']));
      const nameInput = el('input', {
        class: 'g-modal-input', type: 'text', autocomplete: 'off',
        placeholder: 'Ej. Upper A', value: original ? original.nombre : ''
      });
      s.modal.appendChild(nameInput);
      if (!original) {
        const conPlantilla = new Set(plantillas.map((t) => normalizeKey(t.nombre)));
        const libres = routinesWithoutTemplate(sesiones, conPlantilla);
        if (libres.length > 0) {
          s.modal.appendChild(el('div', { class: 'g-modal-body', style: 'margin:10px 0 8px;' }, ['Tus rutinas sin plantilla:']));
          const chips = el('div', { class: 'g-chip-grid g-tpl-chips' });
          libres.forEach((r) => {
            const c = el('button', { class: 'g-chip', type: 'button' }, [r]);
            c.addEventListener('click', () => { nameInput.value = r; });
            chips.appendChild(c);
          });
          s.modal.appendChild(chips);
        }
      }

      // Ejercicios: mantener presionado y arrastrar para ordenar (el mismo gesto
      // que en la sesión, dragorder.js), ✕ para quitar.
      s.modal.appendChild(el('div', { class: 'g-modal-sub' }, ['Ejercicios']));
      const hint = el('div', { class: 'g-modal-body g-tpl-hint' }, ['Mantén presionado un ejercicio y arrástralo para cambiar el orden.']);
      s.modal.appendChild(hint);
      const lista = el('div', { class: 'g-tpl-list' });
      s.modal.appendChild(lista);
      let dragOff = null;

      function pintarLista() {
        clear(lista);
        if (dragOff) { dragOff(); dragOff = null; }
        hint.style.display = ids.length > 1 ? '' : 'none';
        if (ids.length === 0) {
          lista.appendChild(el('div', { class: 'g-empty-card' }, ['Agrega los ejercicios de esta rutina en el orden en que los haces.']));
          return;
        }
        ids.forEach((id, i) => {
          const ej = ejMap[id];
          const quitar = el('button', {
            class: 'g-tpl-remove', type: 'button', 'aria-label': 'Quitar ' + ej.nombre
          }, [ICON.trash({ size: 17 })]);
          quitar.addEventListener('click', () => {
            ids.splice(ids.indexOf(id), 1);
            pintarLista();
          });
          const row = el('div', { class: 'g-tpl-item', 'data-drag-id': String(id) }, [
            el('div', { class: 'g-tpl-item-main', 'data-drag-handle': '' }, [
              el('span', { class: 'g-tpl-num' }, [String(i + 1)]),
              el('div', {}, [
                el('div', { class: 'g-list-name' }, [ej.nombre]),
                el('div', { class: 'g-list-sub' }, [(ej.musculos || []).join(' · ') || 'sin músculo'])
              ])
            ]),
            quitar
          ]);
          lista.appendChild(row);
        });
        if (ids.length > 1) {
          dragOff = enableDragOrder(lista, {
            onStart: () => { document.body.classList.add('g-drag-activo'); },
            onEnd: () => { document.body.classList.remove('g-drag-activo'); },
            onDrop: (nuevo) => {
              ids.splice(0, ids.length, ...nuevo.map(Number));
              pintarLista();
            }
          });
        }
      }
      pintarLista();

      const agregar = el('button', { class: 'g-add-exercise', type: 'button' }, ['+ Agregar ejercicio']);
      const sumar = (e) => {
        ejMap[e.id] = e;
        if (!ids.includes(e.id)) ids.push(e.id);
        pintarLista();
      };
      agregar.addEventListener('click', () => pickExercise({
        title: 'Agregar a la plantilla',
        disabled: new Set(ids),
        onPick: sumar,
        onCreate: () => showNewExerciseModal(sumar)
      }));
      s.modal.appendChild(agregar);

      const guardar = el('button', { class: 'g-btn-primary', type: 'button' }, ['Guardar plantilla']);
      once(guardar, () => {
        const r = saveTemplate(plantillas, { nombre: nameInput.value, ejercicios: ids }, original ? original.nombre : null);
        if (!r.ok) { toast(r.error); return null; }
        return guard(prefSet(TEMPLATES_PREF, r.templates), 'guardando plantilla').then(() => {
          if (dragOff) dragOff();
          s.close();
          toast('Plantilla ' + cleanTemplateName(nameInput.value) + ' guardada');
          if (onSaved) onSaved();
        });
      });
      s.modal.appendChild(guardar);

      if (original) {
        const borrar = el('button', { class: 'g-btn-secondary g-danger', type: 'button' }, ['Borrar plantilla']);
        borrar.addEventListener('click', () => {
          confirmAction(
            '¿Borrar la plantilla ' + original.nombre + '?',
            'Tu historial no se toca. ' + original.nombre + ' volverá a cargar los ejercicios de tu última vez.',
            () => guard(prefSet(TEMPLATES_PREF, deleteTemplate(plantillas, original.nombre)), 'borrando plantilla')
              .then(() => {
                if (dragOff) dragOff();
                s.close();
                toast('Plantilla borrada');
                if (onSaved) onSaved();
              }),
            { destructive: true, okLabel: 'Borrar plantilla' }
          );
        });
        s.modal.appendChild(borrar);
      }

      s.open();
    });
}

// Rutinas que ya has hecho (sesiones finalizadas), sin plantilla, de la más
// reciente a la más vieja. Una por nombre normalizado, con el nombre más
// reciente como se escribió (limpio de espacios repetidos).
function routinesWithoutTemplate(sesiones, conPlantilla) {
  const vistas = new Set();
  const out = [];
  sesiones.slice()
    .filter((x) => x.finalizada === true && x.routine_type)
    .sort((a, b) => sessionTs(b) - sessionTs(a))
    .forEach((x) => {
      const k = normalizeKey(x.routine_type);
      if (vistas.has(k) || conPlantilla.has(k)) return;
      vistas.add(k);
      out.push(cleanTemplateName(x.routine_type));
    });
  return out;
}
