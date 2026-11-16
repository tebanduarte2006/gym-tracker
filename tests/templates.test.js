import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizeTemplates, findTemplate, saveTemplate, deleteTemplate,
  templateExerciseIds, templatesWithExercise, skippedStreak, cleanTemplateName
} from '../js/templates.js';

test('una rutina = una plantilla: mayúsculas, tildes y espacios no crean otra', () => {
  let r = saveTemplate([], { nombre: 'Upper A', ejercicios: [1, 2] }, null);
  assert.ok(r.ok);
  const dup = saveTemplate(r.templates, { nombre: '  upper   a ', ejercicios: [3] }, null);
  assert.equal(dup.ok, false);
  assert.match(dup.error, /Upper A/);
  r = saveTemplate(r.templates, { nombre: 'Legs  A', ejercicios: [5] }, null);
  assert.equal(r.templates.find((t) => t.nombre === 'Legs A').ejercicios[0], 5);
  assert.equal(findTemplate(r.templates, 'Legs  A').nombre, 'Legs A');
  assert.equal(findTemplate(r.templates, 'legs a').nombre, 'Legs A');
  assert.equal(findTemplate(r.templates, 'Legs B'), null);
});

test('editar una plantilla la reemplaza, no la duplica; renombrar no deja la vieja', () => {
  let r = saveTemplate([], { nombre: 'Upper A', ejercicios: [1, 2] }, null);
  r = saveTemplate(r.templates, { nombre: 'Upper A', ejercicios: [2, 1, 3] }, 'Upper A');
  assert.equal(r.templates.length, 1);
  assert.deepEqual(r.templates[0].ejercicios, [2, 1, 3]);
  r = saveTemplate(r.templates, { nombre: 'Upper 1', ejercicios: [2] }, 'Upper A');
  assert.deepEqual(r.templates.map((t) => t.nombre), ['Upper 1']);
});

test('renombrar hacia el nombre de OTRA plantilla se rechaza', () => {
  let r = saveTemplate([], { nombre: 'Upper A', ejercicios: [1] }, null);
  r = saveTemplate(r.templates, { nombre: 'Upper B', ejercicios: [2] }, null);
  const choque = saveTemplate(r.templates, { nombre: 'upper b', ejercicios: [1] }, 'Upper A');
  assert.equal(choque.ok, false);
});

test('sin nombre o sin ejercicios no se guarda', () => {
  assert.equal(saveTemplate([], { nombre: '  ', ejercicios: [1] }, null).ok, false);
  assert.equal(saveTemplate([], { nombre: 'X', ejercicios: [] }, null).ok, false);
});

test('sanitize descarta basura, ids repetidos y plantillas duplicadas', () => {
  const t = sanitizeTemplates([
    null, { nombre: 'A', ejercicios: [1, 1, '2', -3, 'x'] }, { nombre: ' a ', ejercicios: [9] }, { ejercicios: [1] }
  ]);
  assert.deepEqual(t, [{ nombre: 'A', ejercicios: [1, 2] }]);
  assert.deepEqual(sanitizeTemplates('nope'), []);
  assert.equal(cleanTemplateName('  Legs   A '), 'Legs A');
});

test('borrar, ids existentes y en qué plantillas está un ejercicio', () => {
  const t = [{ nombre: 'Upper A', ejercicios: [1, 2, 3] }, { nombre: 'Upper B', ejercicios: [3] }];
  assert.deepEqual(deleteTemplate(t, 'upper a').map((x) => x.nombre), ['Upper B']);
  assert.deepEqual(templateExerciseIds(t[0], [3, 1]), [1, 3]);
  assert.deepEqual(templatesWithExercise(t, 3), ['Upper A', 'Upper B']);
});

test('skippedStreak: cuenta las veces seguidas que estaba en la lista y no se hizo', () => {
  const ses = (id, ts, orden) => ({ id, timestamp_inicio: ts, finalizada: true, routine_type: 'Upper A', ej_orden: orden });
  const sesiones = [ses(1, 100, [7, 8]), ses(2, 200, [7, 8]), ses(3, 300, [7, 8]), { ...ses(4, 400, [7, 8]), finalizada: false }];
  const sets = [
    { sesion_id: 1, ejercicio_id: 8, status: 'Done', peso: 20, reps: 8 },
    { sesion_id: 1, ejercicio_id: 7, status: 'Done', peso: 20, reps: 8 },
    { sesion_id: 2, ejercicio_id: 7, status: 'Done', peso: 20, reps: 8 },
    { sesion_id: 3, ejercicio_id: 7, status: 'Done', peso: 20, reps: 8 },
    { sesion_id: 3, ejercicio_id: 8, status: 'Pending', peso: 20, reps: 8 }
  ];
  assert.equal(skippedStreak('upper a', 8, sesiones, sets), 2);
  assert.equal(skippedStreak('Upper A', 7, sesiones, sets), 0);
});

test('skippedStreak se corta donde el ejercicio no estaba en la lista', () => {
  const sesiones = [
    { id: 1, timestamp_inicio: 100, finalizada: true, routine_type: 'Legs', ej_orden: [1] },
    { id: 2, timestamp_inicio: 200, finalizada: true, routine_type: 'Legs', ej_orden: [1, 9] }
  ];
  assert.equal(skippedStreak('Legs', 9, sesiones, []), 1);
  assert.equal(skippedStreak('Otra', 9, sesiones, []), 0);
});
