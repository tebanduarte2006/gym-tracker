import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { normalizeBackup, buildExport, EXPORT_VERSION } from '../js/importer.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

test('rechaza shapes inválidos con mensaje claro', () => {
  assert.throws(() => normalizeBackup(null), /backup válido/);
  assert.throws(() => normalizeBackup({}), /versión/);
  assert.throws(() => normalizeBackup({ version: 99, sesiones: [], ejercicios: [], sets: [] }), /no soportada/);
  assert.throws(() => normalizeBackup({ version: 2, sesiones: [], ejercicios: [] }), /"sets"/);
});

test('v2: convierte peso_lbs legacy a kg', () => {
  const r = normalizeBackup({
    version: 2,
    sesiones: [{ id: 1, fecha: '2026-04-07', finalizada: true }],
    ejercicios: [{ id: 1, nombre: 'Press', musculo_primario: '["Pecho"]' }],
    sets: [{ id: 1, sesion_id: 1, ejercicio_id: 1, peso_lbs: 65, reps: 7 }]
  });
  assert.equal(r.sets.length, 1);
  assert.equal(r.sets[0].peso, 29.484);
  assert.equal(r.sets[0].status, 'Done');
});

test('v2: descarta placeholders y sets huérfanos, parsea músculos', () => {
  const r = normalizeBackup({
    version: 2,
    sesiones: [{ id: 1, fecha: '2026-04-07', finalizada: true }],
    ejercicios: [
      { id: 1, nombre: 'Curl', musculo_primario: '["Bíceps","Antebrazo"]' },
      { id: 2, nombre: 'Viejo', musculo_primario: 'Pecho' }
    ],
    sets: [
      { id: 1, sesion_id: 1, ejercicio_id: 1, peso: 0, reps: 0, status: 'Pending' },
      { id: 2, sesion_id: 1, ejercicio_id: 1, peso: 10, reps: 8, status: 'Done' },
      { id: 3, sesion_id: 99, ejercicio_id: 1, peso: 10, reps: 8 },
      { id: 4, sesion_id: 1, ejercicio_id: 77, peso: 10, reps: 8 }
    ]
  });
  assert.equal(r.sets.length, 1);
  assert.deepEqual(r.ejercicios[0].musculos, ['Bíceps', 'Antebrazo']);
  assert.deepEqual(r.ejercicios[1].musculos, ['Pecho']);
  assert.equal(r.warnings.length, 2);
});

test('v2: peso corporal (0 kg con reps) NO se descarta', () => {
  const r = normalizeBackup({
    version: 2,
    sesiones: [{ id: 1, fecha: '2026-04-07', finalizada: true }],
    ejercicios: [{ id: 1, nombre: 'Dragon Flags', musculo_primario: '["Core"]' }],
    sets: [{ id: 1, sesion_id: 1, ejercicio_id: 1, peso: 0, reps: 12, status: 'Done' }]
  });
  assert.equal(r.sets.length, 1);
});

test('v3 roundtrip: buildExport → normalizeBackup conserva todo', () => {
  const exp = buildExport({
    sesiones: [{ id: 1, fecha: '2026-07-28', finalizada: true, timestamp_inicio: 5, nombre: 'W', routine_type: 'Push' }],
    ejercicios: [{ id: 1, nombre: 'Press', musculos: ['Pecho'], tipo: 'Push', rest_sec: 120 }],
    sets: [{ id: 1, sesion_id: 1, ejercicio_id: 1, peso: 29.483, reps: 7, status: 'Done', unidad: 'lbs', ts: 1700000000000 }],
    cardio: [{ id: 1, sesion_id: 1, tipo: 'Caminadora', duracion_min: 10, velocidad_kmh: 4, inclinacion: 10, ts: 1700000000001 }],
    preferencias: [
      { clave: 'rest_default', valor: 120 },
      { clave: 'contador_workouts', valor: 42 }
    ]
  });
  assert.equal(exp.version, EXPORT_VERSION);
  const r = normalizeBackup(exp);
  assert.equal(r.sets[0].peso, 29.483);
  assert.equal(r.sets[0].unidad, 'lbs');
  assert.equal(r.ejercicios[0].rest_sec, 120);
  assert.equal(r.cardio.length, 1);
  assert.equal(r.cardio[0].velocidad_kmh, 4);
  // Estas tres aserciones son la razón de existir del test. Antes se llamaba
  // "conserva todo" y NO comprobaba ni ts ni preferencias — justo lo que el
  // importador tiraba a la basura al restaurar el backup en otro teléfono.
  assert.equal(r.sets[0].ts, 1700000000000);
  assert.equal(r.cardio[0].ts, 1700000000001);
  assert.deepEqual(r.preferencias, [
    { clave: 'rest_default', valor: 120 },
    { clave: 'contador_workouts', valor: 42 }
  ]);
});

test('preferencias: solo pasan las claves de la lista blanca', () => {
  const r = normalizeBackup({
    version: 3,
    sesiones: [], ejercicios: [], sets: [],
    preferencias: [
      { clave: 'rest_default', valor: 75 },
      { clave: 'clave_inventada', valor: 'x' },
      { clave: 'seed_decidido', valor: true }
    ]
  });
  assert.deepEqual(r.preferencias.map((p) => p.clave), ['rest_default', 'seed_decidido']);
  assert.ok(r.warnings.some((w) => /desconocida/.test(w)));
});

test('backup sin preferencias: lista vacía, nunca undefined', () => {
  const r = normalizeBackup({ version: 2, sesiones: [], ejercicios: [], sets: [] });
  assert.deepEqual(r.preferencias, []);
});

test('backup REAL de Esteban (data/seed.json): importa completo y sin sorpresas', () => {
  const seedPath = join(ROOT, 'data', 'seed.json');
  if (!existsSync(seedPath)) {
    assert.fail('data/seed.json no existe — el seed con los datos históricos es parte del repo');
  }
  const raw = JSON.parse(readFileSync(seedPath, 'utf8'));
  const r = normalizeBackup(raw);
  assert.equal(r.sesiones.length, 35);
  assert.equal(r.ejercicios.length, 36);
  // 578 sets crudos − 19 placeholders = 559 reales
  assert.equal(r.sets.length, 559);
  // Los 167 sets legacy peso_lbs quedaron todos con peso en kg > 0 o peso corporal
  assert.ok(r.sets.every((s) => isFinite(s.peso) && s.peso >= 0));
  assert.ok(r.sets.every((s) => s.status === 'Done' || s.status === 'Pending' || s.status === 'Skipped'));
  // Todas las sesiones finalizadas
  assert.ok(r.sesiones.every((s) => s.finalizada === true));
  // Músculos siempre array no vacío
  assert.ok(r.ejercicios.every((e) => Array.isArray(e.musculos) && e.musculos.length > 0));
});
