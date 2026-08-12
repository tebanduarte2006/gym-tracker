import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  MUSCLES, MUSCLE_GROUPS, isCanonical, canonicalMuscle,
  canonicalizeExercise, planMuscleMigration, needsMuscleMigration, isVagueRegion
} from '../js/muscles.js';
import { normalizeBackup } from '../js/importer.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

test('la taxonomía no tiene duplicados ni por nombre ni por normalización', () => {
  const key = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const claves = MUSCLES.map(key);
  assert.equal(new Set(claves).size, MUSCLES.length, 'hay músculos duplicados');
  assert.equal(new Set(MUSCLES).size, MUSCLES.length);
});

test('MUSCLES es exactamente la concatenación de los grupos', () => {
  const plano = MUSCLE_GROUPS.reduce((a, g) => a.concat(g.musculos), []);
  assert.deepEqual(MUSCLES, plano);
});

test('ninguna región vaga entra en la taxonomía (evita el doble conteo)', () => {
  // El defecto original: 'Espalda' y 'Dorsales' seleccionables a la vez hacían
  // que un mismo set contara dos veces en el volumen por músculo.
  ['Espalda', 'Hombros', 'Piernas', 'Core', 'Tren superior'].forEach((r) => {
    assert.ok(!isCanonical(r), r + ' no debería estar en la lista');
    assert.ok(isVagueRegion(r), r + ' debería reconocerse como región vaga');
  });
});

test('canonicalMuscle resuelve los renombres mecánicos', () => {
  assert.equal(canonicalMuscle('Aductor'), 'Aductores');
  assert.equal(canonicalMuscle('Abductor'), 'Abductores');
  assert.equal(canonicalMuscle('Trapecio'), 'Trapecios');
  assert.equal(canonicalMuscle('Lumbar'), 'Lumbares');
  assert.equal(canonicalMuscle('Hombro frontal'), 'Deltoides frontal');
  assert.equal(canonicalMuscle('Romboides'), 'Trapecios');
  assert.equal(canonicalMuscle('Pecho superior'), 'Pecho');
});

test('canonicalMuscle ignora tildes y mayúsculas', () => {
  assert.equal(canonicalMuscle('cuadriceps'), 'Cuádriceps');
  assert.equal(canonicalMuscle('  TRICEPS  '), 'Tríceps');
  assert.equal(canonicalMuscle('biceps'), 'Bíceps');
});

test('canonicalMuscle NO adivina regiones vagas ni nombres desconocidos', () => {
  assert.equal(canonicalMuscle('Espalda'), null);
  assert.equal(canonicalMuscle('Hombros'), null);
  assert.equal(canonicalMuscle('Musculo inventado'), null);
  assert.equal(canonicalMuscle(''), null);
  assert.equal(canonicalMuscle(null), null);
});

test('canonicalizeExercise traduce por ejercicio las regiones vagas del historial', () => {
  const r = canonicalizeExercise('Cable Lateral Raise', ['Hombros']);
  assert.deepEqual(r.musculos, ['Deltoides lateral']);
  assert.ok(r.cambio);
  assert.deepEqual(r.sinResolver, []);
});

test('canonicalizeExercise NO inventa músculos que la etiqueta vaga no cubría', () => {
  // 'Espalda' en un remo sí quiere decir dorsales y trapecios. Añadirle bíceps
  // sería una decisión de entrenamiento disfrazada de limpieza de datos.
  const r = canonicalizeExercise('S/A Cable Row', ['Espalda', 'Dorsales']);
  assert.deepEqual(r.musculos, ['Dorsales', 'Trapecios']);
  assert.ok(!r.musculos.includes('Bíceps'));
});

test('canonicalizeExercise deja sin resolver lo que no puede traducir', () => {
  const r = canonicalizeExercise('Ejercicio Desconocido', ['Espalda', 'Pecho']);
  assert.deepEqual(r.musculos, ['Pecho']);
  assert.deepEqual(r.sinResolver, ['Espalda']);
  assert.ok(r.cambio);
});

test('canonicalizeExercise no marca cambio si ya estaba canónico', () => {
  const r = canonicalizeExercise('Lo que sea', ['Pecho', 'Tríceps']);
  assert.deepEqual(r.musculos, ['Pecho', 'Tríceps']);
  assert.equal(r.cambio, false);
  assert.deepEqual(r.sinResolver, []);
});

test('canonicalizeExercise elimina duplicados y ordena estable', () => {
  // 'Trapecio' y 'Romboides' colapsan al mismo músculo.
  const r = canonicalizeExercise('X', ['Romboides', 'Trapecio', 'Pecho']);
  assert.deepEqual(r.musculos, ['Pecho', 'Trapecios'], 'sin duplicados y en orden de MUSCLES');
});

test('planMuscleMigration solo devuelve lo que cambia', () => {
  const ejercicios = [
    { id: 1, nombre: 'Bench Press', musculos: ['Pecho', 'Tríceps'] },
    { id: 2, nombre: 'Cable Lateral Raise', musculos: ['Hombros'] }
  ];
  const plan = planMuscleMigration(ejercicios);
  assert.equal(plan.length, 1);
  assert.equal(plan[0].id, 2);
  assert.deepEqual(plan[0].antes, ['Hombros']);
  assert.deepEqual(plan[0].despues, ['Deltoides lateral']);
});

test('needsMuscleMigration es false sobre un directorio ya canónico', () => {
  assert.equal(needsMuscleMigration([{ id: 1, nombre: 'X', musculos: ['Pecho'] }]), false);
  assert.equal(needsMuscleMigration([]), false);
});

// El test que de verdad importa: sobre los 36 ejercicios REALES de Esteban, la
// migración no puede dejar ni un solo músculo fuera de la taxonomía ni ningún
// ejercicio sin músculos. Si alguna vez falla, es que el seed cambió y la tabla
// POR_EJERCICIO se quedó corta.
test('migración del directorio REAL: todo queda canónico y nadie se queda sin músculos', () => {
  const raw = JSON.parse(readFileSync(join(ROOT, 'data', 'seed.json'), 'utf8'));
  const { ejercicios } = normalizeBackup(raw);
  assert.equal(ejercicios.length, 36);

  const plan = planMuscleMigration(ejercicios);
  const porId = new Map(plan.map((p) => [p.id, p]));

  ejercicios.forEach((e) => {
    const p = porId.get(e.id);
    const finales = p ? p.despues : e.musculos;
    assert.ok(finales.length > 0, e.nombre + ' se quedaría sin músculos');
    finales.forEach((m) => {
      assert.ok(isCanonical(m), e.nombre + ' conserva un músculo no canónico: ' + m);
    });
    if (p) assert.deepEqual(p.sinResolver, [], e.nombre + ' tiene músculos sin resolver');
  });
});

test('migración del directorio REAL: los 11 ejercicios con región vaga se traducen', () => {
  const raw = JSON.parse(readFileSync(join(ROOT, 'data', 'seed.json'), 'utf8'));
  const { ejercicios } = normalizeBackup(raw);
  const vagos = ejercicios.filter((e) => (e.musculos || []).some(isVagueRegion));
  assert.equal(vagos.length, 11, 'el seed tiene 11 ejercicios con Espalda/Hombros');
  vagos.forEach((e) => {
    const r = canonicalizeExercise(e.nombre, e.musculos);
    assert.deepEqual(r.sinResolver, [], e.nombre + ' no tiene traducción por ejercicio');
  });
});
