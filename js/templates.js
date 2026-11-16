// templates.js — [PURO] plantillas fijas por rutina. Sin DOM ni IndexedDB.
//
// Decisión de Esteban (2026-11-16, reemplaza la de 2026-08-12): cada rutina
// puede tener UNA plantilla fija con sus ejercicios y su orden. Si existe, al
// empezar esa rutina se carga la plantilla entera, aunque la última vez se haya
// saltado un ejercicio. Si no existe, sigue el autollenado desde la última
// sesión (stats.js › autofillPlan). Los pesos y los sets NO van en la plantilla:
// cambian cada día y salen de "Última sesión" de cada ejercicio.
//
// Se guarda como preferencia (`plantillas`, en PREFS_IMPORTABLES): entra en el
// respaldo sin tocar el esquema de IndexedDB.
//   [{ nombre: 'Upper A', ejercicios: [28, 2, 4, …] }, …]
//
// Una rutina = una plantilla: la clave es normalizeKey(nombre), así "Upper A",
// "upper a" y "Upper  A" son la misma y no se puede crear una segunda.

import { normalizeKey } from './format.js';
import { sessionTs, isCountable } from './stats.js';

export const TEMPLATES_PREF = 'plantillas';

// Nombre limpio para mostrar y guardar: sin espacios repetidos ni sobrantes.
export function cleanTemplateName(nombre) {
  return String(nombre == null ? '' : nombre).replace(/\s+/g, ' ').trim();
}

// Deja la lista en forma canónica: descarta entradas rotas, ids repetidos dentro
// de una plantilla y plantillas duplicadas (gana la primera). Nunca lanza: un
// respaldo raro no puede tumbar la pantalla.
export function sanitizeTemplates(raw) {
  if (!Array.isArray(raw)) return [];
  const vistas = new Set();
  const salida = [];
  raw.forEach((t) => {
    if (!t || typeof t !== 'object') return;
    const nombre = cleanTemplateName(t.nombre);
    const key = normalizeKey(nombre);
    if (!key || vistas.has(key)) return;
    vistas.add(key);
    const ids = [];
    (Array.isArray(t.ejercicios) ? t.ejercicios : []).forEach((id) => {
      const n = Number(id);
      if (Number.isInteger(n) && n > 0 && !ids.includes(n)) ids.push(n);
    });
    salida.push({ nombre, ejercicios: ids });
  });
  return salida;
}

// Plantilla de una rutina (por nombre normalizado) o null.
export function findTemplate(templates, routineType) {
  const key = normalizeKey(routineType);
  if (!key) return null;
  return sanitizeTemplates(templates).find((t) => normalizeKey(t.nombre) === key) || null;
}

// Crea o reemplaza una plantilla. `previousName` es el nombre con el que se abrió
// el editor (null si es nueva): permite renombrar sin que la vieja quede viva.
// Devuelve { ok: true, templates } o { ok: false, error } con un error legible.
export function saveTemplate(templates, { nombre, ejercicios }, previousName) {
  const lista = sanitizeTemplates(templates);
  const limpio = cleanTemplateName(nombre);
  const key = normalizeKey(limpio);
  if (!key) return { ok: false, error: 'Escribe el nombre de la rutina' };
  const ids = sanitizeTemplates([{ nombre: limpio, ejercicios }])[0].ejercicios;
  if (ids.length === 0) return { ok: false, error: 'Agrega al menos un ejercicio' };

  const prevKey = normalizeKey(previousName);
  const choque = lista.find((t) => normalizeKey(t.nombre) === key && normalizeKey(t.nombre) !== prevKey);
  if (choque) return { ok: false, error: 'Ya tienes una plantilla para ' + choque.nombre };

  const nueva = { nombre: limpio, ejercicios: ids };
  const idx = prevKey ? lista.findIndex((t) => normalizeKey(t.nombre) === prevKey) : -1;
  if (idx >= 0) lista[idx] = nueva; else lista.push(nueva);
  return { ok: true, templates: sortTemplates(lista) };
}

export function deleteTemplate(templates, nombre) {
  const key = normalizeKey(nombre);
  return sanitizeTemplates(templates).filter((t) => normalizeKey(t.nombre) !== key);
}

// Orden alfabético natural ("Upper A" antes que "Upper B", "Legs 2" antes que
// "Legs 10"): es la lista que él escanea para encontrar una.
export function sortTemplates(templates) {
  return templates.slice().sort((a, b) =>
    a.nombre.localeCompare(b.nombre, 'es', { numeric: true, sensitivity: 'base' }));
}

// Ids de la plantilla que todavía existen, en su orden. Un ejercicio borrado no
// puede romper el arranque de la sesión.
export function templateExerciseIds(template, existingIds) {
  if (!template) return [];
  const existe = new Set(existingIds || []);
  return template.ejercicios.filter((id) => existe.has(id));
}

// En qué plantillas aparece un ejercicio (para su ficha).
export function templatesWithExercise(templates, ejercicioId) {
  return sanitizeTemplates(templates).filter((t) => t.ejercicios.includes(ejercicioId)).map((t) => t.nombre);
}

// ¿Cuántas veces SEGUIDAS, contando desde la última, se saltó este ejercicio en
// esta rutina? Saltar = estaba en la lista de la sesión (`ej_orden`) y terminó
// sin un solo set registrado. Se corta en la primera sesión en que lo hizo o en
// la que ni siquiera estaba: así un ejercicio recién agregado a la plantilla no
// aparece como "saltado 12 veces" por sesiones de antes de existir en ella.
export function skippedStreak(routineType, ejercicioId, sesiones, sets) {
  const key = normalizeKey(routineType);
  if (!key) return 0;
  const ses = (sesiones || [])
    .filter((s) => s.finalizada === true && normalizeKey(s.routine_type) === key)
    .sort((a, b) => sessionTs(b) - sessionTs(a));
  if (ses.length === 0) return 0;
  const hechos = new Set();
  (sets || []).forEach((st) => {
    if (st.ejercicio_id === ejercicioId && isCountable(st)) hechos.add(st.sesion_id);
  });
  let n = 0;
  for (const s of ses) {
    if (hechos.has(s.id)) break;
    if (!Array.isArray(s.ej_orden) || !s.ej_orden.includes(ejercicioId)) break;
    n += 1;
  }
  return n;
}

