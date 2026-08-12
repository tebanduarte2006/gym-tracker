import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isCountable, isPlaceholder, visibleSets, weightPR, repsPR,
  epley1RM, volumeKg, sessionRows, markRunningPRs, nextWorkoutNumber,
  suggestNextSet, setsPerMuscle, autofillPlan
} from '../js/stats.js';

const done = (peso, reps, extra = {}) => ({ peso, reps, status: 'Done', ...extra });
const skipped = (peso, reps) => ({ peso, reps, status: 'Skipped' });
const pending = (peso, reps) => ({ peso, reps, status: 'Pending' });

test('Skipped NO cuenta para PR (bug heredado corregido)', () => {
  const sets = [done(50, 8), skipped(100, 5)];
  assert.equal(weightPR(sets).peso, 50);
});

test('Pending NO cuenta; legacy sin status cuenta como Done', () => {
  const sets = [pending(80, 5), { peso: 60, reps: 6 }];
  assert.equal(weightPR(sets).peso, 60);
});

test('peso corporal (0 kg) es contable y no es placeholder', () => {
  const bw = done(0, 12);
  assert.ok(isCountable(bw));
  assert.ok(!isPlaceholder(bw));
  assert.ok(isPlaceholder(pending(0, 0)));
});

test('visibleSets excluye solo placeholders', () => {
  const sets = [pending(0, 0), pending(50, 5), done(0, 10)];
  assert.equal(visibleSets(sets).length, 2);
});

test('weightPR desempata por reps; repsPR desempata por peso', () => {
  const sets = [done(50, 8), done(50, 10), done(40, 10)];
  const w = weightPR(sets);
  assert.deepEqual([w.peso, w.reps], [50, 10]);
  const r = repsPR(sets);
  assert.deepEqual([r.peso, r.reps], [50, 10]);
});

test('epley1RM', () => {
  assert.equal(epley1RM(100, 1), 103);
  assert.equal(epley1RM(100, 10), 133);
  assert.equal(epley1RM(100, 0), null);
});

test('volumeKg suma solo Done', () => {
  assert.equal(volumeKg([done(10, 10), skipped(100, 10), pending(5, 5)]), 100);
});

test('sessionRows agrupa, ordena cronológicamente y excluye sesiones no finalizadas', () => {
  const sesionMap = {
    1: { id: 1, finalizada: true, timestamp_inicio: 1000, fecha: '2026-01-01' },
    2: { id: 2, finalizada: true, timestamp_inicio: 3000, fecha: '2026-01-03' },
    3: { id: 3, finalizada: false, timestamp_inicio: 2000, fecha: '2026-01-02' }
  };
  const sets = [
    done(40, 8, { sesion_id: 2, id: 5, orden: 1 }),
    done(30, 8, { sesion_id: 1, id: 1, orden: 1 }),
    done(35, 6, { sesion_id: 1, id: 2, orden: 2 }),
    done(99, 9, { sesion_id: 3, id: 9, orden: 1 })
  ];
  const rows = sessionRows(sets, sesionMap);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].sesion.id, 1);
  assert.equal(rows[0].maxPesoKg, 35);
  assert.equal(rows[0].volumenKg, 30 * 8 + 35 * 6);
  assert.equal(rows[1].sesion.id, 2);
});

test('nextWorkoutNumber respeta historial importado y contador', () => {
  const importadas = [{ nombre: 'Workout #35 · Legs' }, { nombre: 'Workout #12 · Push' }];
  assert.equal(nextWorkoutNumber(0, importadas), 36);   // historial manda
  assert.equal(nextWorkoutNumber(50, importadas), 51);  // contador manda
  assert.equal(nextWorkoutNumber(0, []), 1);            // arranque limpio
  assert.equal(nextWorkoutNumber(0, [{ nombre: 'Mi rutina' }]), 1); // nombres sin patrón
});

test('markRunningPRs marca récords en orden cronológico', () => {
  const sesionMap = {
    1: { id: 1, finalizada: true, timestamp_inicio: 1 },
    2: { id: 2, finalizada: true, timestamp_inicio: 2 }
  };
  const s1 = done(30, 8, { sesion_id: 1, id: 1 });
  const s2 = done(35, 8, { sesion_id: 2, id: 2 });
  const s3 = done(30, 12, { sesion_id: 2, id: 3 });
  const rows = markRunningPRs(sessionRows([s1, s2, s3], sesionMap));
  assert.equal(s1._isPR, true);
  assert.equal(s2._isPR, true);
  assert.equal(s3._isPR, false);
  assert.equal(rows.length, 2);
});

// ─── Set fantasma ─────────────────────────────────────────────────────────────
test('suggestNextSet propone el set correspondiente de la sesión anterior', () => {
  const prev = [
    { peso: 60, reps: 10, status: 'Done' },
    { peso: 70, reps: 8, status: 'Done' },
    { peso: 70, reps: 6, status: 'Done' }
  ];
  assert.deepEqual(suggestNextSet(prev, 0), { peso: 60, reps: 10 });
  assert.deepEqual(suggestNextSet(prev, 1), { peso: 70, reps: 8 });
  assert.deepEqual(suggestNextSet(prev, 2), { peso: 70, reps: 6 });
});

test('suggestNextSet repite el último set si esta vez haces más series', () => {
  const prev = [{ peso: 60, reps: 10, status: 'Done' }, { peso: 70, reps: 8, status: 'Done' }];
  assert.deepEqual(suggestNextSet(prev, 5), { peso: 70, reps: 8 });
});

test('suggestNextSet devuelve null sin historial', () => {
  assert.equal(suggestNextSet([], 0), null);
  assert.equal(suggestNextSet(null, 0), null);
  assert.equal(suggestNextSet(undefined, 3), null);
});

test('suggestNextSet acepta peso 0 (peso corporal) pero no reps 0', () => {
  assert.deepEqual(suggestNextSet([{ peso: 0, reps: 12 }], 0), { peso: 0, reps: 12 });
  assert.equal(suggestNextSet([{ peso: 50, reps: 0 }], 0), null);
});

// ─── Volumen por grupo muscular ───────────────────────────────────────────────
test('setsPerMuscle cuenta un set para CADA músculo del ejercicio', () => {
  const ejMap = {
    1: { id: 1, nombre: 'Bench', musculos: ['Pecho', 'Tríceps'] },
    2: { id: 2, nombre: 'Curl', musculos: ['Bíceps'] }
  };
  const sets = [
    { ejercicio_id: 1, peso: 60, reps: 10, status: 'Done' },
    { ejercicio_id: 1, peso: 60, reps: 8, status: 'Done' },
    { ejercicio_id: 2, peso: 20, reps: 12, status: 'Done' }
  ];
  const r = setsPerMuscle(sets, ejMap);
  const byName = Object.fromEntries(r.map((x) => [x.musculo, x]));
  assert.equal(byName['Pecho'].sets, 2);
  assert.equal(byName['Tríceps'].sets, 2, 'el mismo set cuenta para los dos músculos');
  assert.equal(byName['Bíceps'].sets, 1);
  assert.equal(byName['Pecho'].volumenKg, 60 * 10 + 60 * 8);
});

test('setsPerMuscle ignora sets que no están Done', () => {
  const ejMap = { 1: { id: 1, musculos: ['Pecho'] } };
  const sets = [
    { ejercicio_id: 1, peso: 60, reps: 10, status: 'Done' },
    { ejercicio_id: 1, peso: 60, reps: 10, status: 'Skipped' },
    { ejercicio_id: 1, peso: 60, reps: 10, status: 'Pending' }
  ];
  const r = setsPerMuscle(sets, ejMap);
  assert.equal(r.length, 1);
  assert.equal(r[0].sets, 1);
});

test('setsPerMuscle agrupa como "Sin músculo" lo que no tiene músculos', () => {
  const ejMap = { 1: { id: 1, musculos: [] }, 2: { id: 2 } };
  const sets = [
    { ejercicio_id: 1, peso: 10, reps: 5, status: 'Done' },
    { ejercicio_id: 2, peso: 10, reps: 5, status: 'Done' },
    { ejercicio_id: 99, peso: 10, reps: 5, status: 'Done' }
  ];
  const r = setsPerMuscle(sets, ejMap);
  assert.deepEqual(r.map((x) => x.musculo), ['Sin músculo']);
  assert.equal(r[0].sets, 3);
});

test('setsPerMuscle ordena de más a menos sets', () => {
  const ejMap = { 1: { id: 1, musculos: ['Pierna'] }, 2: { id: 2, musculos: ['Hombro'] } };
  const sets = [
    { ejercicio_id: 2, peso: 10, reps: 5, status: 'Done' },
    { ejercicio_id: 1, peso: 10, reps: 5, status: 'Done' },
    { ejercicio_id: 1, peso: 10, reps: 5, status: 'Done' }
  ];
  assert.deepEqual(setsPerMuscle(sets, ejMap).map((x) => x.musculo), ['Pierna', 'Hombro']);
});

// ─── Autollenado desde la última sesión de la misma rutina ────────────────────
const ses = (id, routine, ts, extra = {}) =>
  ({ id, routine_type: routine, timestamp_inicio: ts, finalizada: true, ...extra });

test('autofillPlan toma la última sesión finalizada de esa rutina', () => {
  const sesiones = [
    ses(1, 'Upper A', 1000),
    ses(2, 'Upper A', 3000),
    ses(3, 'Lower A', 4000)
  ];
  const sets = [
    { id: 1, sesion_id: 1, ejercicio_id: 10, peso: 50, reps: 8, orden: 1, status: 'Done' },
    { id: 2, sesion_id: 2, ejercicio_id: 10, peso: 60, reps: 8, orden: 1, status: 'Done' },
    { id: 3, sesion_id: 3, ejercicio_id: 20, peso: 90, reps: 5, orden: 1, status: 'Done' }
  ];
  const plan = autofillPlan('Upper A', sesiones, sets);
  assert.equal(plan.sesion.id, 2, 'la más reciente, no la primera');
  assert.deepEqual(plan.ejercicios, [
    { ejercicio_id: 10, sets: [{ peso: 60, reps: 8, unidad: null }] }
  ]);
});

test('autofillPlan ignora mayúsculas, tildes y espacios del nombre', () => {
  const sesiones = [ses(1, 'Día de Pecho', 1000)];
  const sets = [{ id: 1, sesion_id: 1, ejercicio_id: 10, peso: 50, reps: 8, orden: 1, status: 'Done' }];
  assert.ok(autofillPlan('  dia de pecho ', sesiones, sets));
  assert.ok(autofillPlan('DÍA DE PECHO', sesiones, sets));
});

test('autofillPlan NO propone sets que quedaron sin registrar', () => {
  const sesiones = [ses(1, 'Upper A', 1000)];
  const sets = [
    { id: 1, sesion_id: 1, ejercicio_id: 10, peso: 60, reps: 8, orden: 1, status: 'Done' },
    { id: 2, sesion_id: 1, ejercicio_id: 10, peso: 60, reps: 8, orden: 2, status: 'Pending' }
  ];
  const plan = autofillPlan('Upper A', sesiones, sets);
  assert.equal(plan.ejercicios[0].sets.length, 1, 'lo propuesto y no hecho no se hereda');
});

test('autofillPlan respeta ej_orden de aquella sesión', () => {
  const sesiones = [ses(1, 'Upper A', 1000, { ej_orden: [30, 10, 20] })];
  const sets = [
    { id: 1, sesion_id: 1, ejercicio_id: 10, peso: 50, reps: 8, orden: 1, status: 'Done' },
    { id: 2, sesion_id: 1, ejercicio_id: 20, peso: 40, reps: 8, orden: 2, status: 'Done' },
    { id: 3, sesion_id: 1, ejercicio_id: 30, peso: 30, reps: 8, orden: 3, status: 'Done' }
  ];
  const plan = autofillPlan('Upper A', sesiones, sets);
  assert.deepEqual(plan.ejercicios.map((e) => e.ejercicio_id), [30, 10, 20]);
});

test('autofillPlan cae al orden de aparición si no hay ej_orden', () => {
  const sesiones = [ses(1, 'Upper A', 1000)];
  const sets = [
    { id: 3, sesion_id: 1, ejercicio_id: 20, peso: 40, reps: 8, orden: 5, status: 'Done' },
    { id: 1, sesion_id: 1, ejercicio_id: 10, peso: 50, reps: 8, orden: 1, status: 'Done' }
  ];
  const plan = autofillPlan('Upper A', sesiones, sets);
  assert.deepEqual(plan.ejercicios.map((e) => e.ejercicio_id), [10, 20]);
});

test('autofillPlan conserva el orden y la unidad de cada set', () => {
  const sesiones = [ses(1, 'Upper A', 1000)];
  const sets = [
    { id: 2, sesion_id: 1, ejercicio_id: 10, peso: 70, reps: 6, orden: 2, status: 'Done', unidad: 'kg' },
    { id: 1, sesion_id: 1, ejercicio_id: 10, peso: 60, reps: 10, orden: 1, status: 'Done', unidad: 'lbs' }
  ];
  const plan = autofillPlan('Upper A', sesiones, sets);
  assert.deepEqual(plan.ejercicios[0].sets, [
    { peso: 60, reps: 10, unidad: 'lbs' },
    { peso: 70, reps: 6, unidad: 'kg' }
  ]);
});

test('autofillPlan devuelve null la primera vez que haces esa rutina', () => {
  const sesiones = [ses(1, 'Upper A', 1000)];
  const sets = [{ id: 1, sesion_id: 1, ejercicio_id: 10, peso: 50, reps: 8, orden: 1, status: 'Done' }];
  assert.equal(autofillPlan('Lower B', sesiones, sets), null);
  assert.equal(autofillPlan('', sesiones, sets), null);
  assert.equal(autofillPlan(null, sesiones, sets), null);
});

test('autofillPlan ignora sesiones sin finalizar', () => {
  const sesiones = [
    ses(1, 'Upper A', 1000),
    { id: 2, routine_type: 'Upper A', timestamp_inicio: 9000, finalizada: false }
  ];
  const sets = [
    { id: 1, sesion_id: 1, ejercicio_id: 10, peso: 50, reps: 8, orden: 1, status: 'Done' },
    { id: 2, sesion_id: 2, ejercicio_id: 99, peso: 999, reps: 1, orden: 1, status: 'Done' }
  ];
  const plan = autofillPlan('Upper A', sesiones, sets);
  assert.equal(plan.sesion.id, 1);
  assert.deepEqual(plan.ejercicios.map((e) => e.ejercicio_id), [10]);
});

test('autofillPlan devuelve null si la última sesión no registró nada', () => {
  const sesiones = [ses(1, 'Upper A', 1000)];
  const sets = [{ id: 1, sesion_id: 1, ejercicio_id: 10, peso: 0, reps: 0, orden: 0, status: 'Pending' }];
  assert.equal(autofillPlan('Upper A', sesiones, sets), null);
});

test('autofillPlan hereda el peso corporal (0 kg con reps)', () => {
  const sesiones = [ses(1, 'Core', 1000)];
  const sets = [{ id: 1, sesion_id: 1, ejercicio_id: 10, peso: 0, reps: 15, orden: 1, status: 'Done' }];
  const plan = autofillPlan('Core', sesiones, sets);
  assert.deepEqual(plan.ejercicios[0].sets, [{ peso: 0, reps: 15, unidad: null }]);
});
