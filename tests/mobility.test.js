import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  addMobilityDay, buildSteps, dosisText, estimateMinutes, validateRoutine
} from '../js/mobility.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const rutina = JSON.parse(readFileSync(join(ROOT, 'data', 'movilidad.json'), 'utf8'));

// La rutina la editan agentes a mano: esta prueba es la que avisa si quedó mal.
test('data/movilidad.json tiene la forma correcta', () => {
  assert.deepEqual(validateRoutine(rutina), []);
});

test('cada animación de la rutina existe y está en la caché del service worker', () => {
  const sw = readFileSync(join(ROOT, 'sw.js'), 'utf8');
  assert.ok(sw.includes('"./data/movilidad.json"'), 'falta data/movilidad.json en ASSETS');
  rutina.ejercicios.forEach((e) => {
    if (!e.animacion) return;
    assert.ok(existsSync(join(ROOT, e.animacion)), 'no existe ' + e.animacion);
    assert.ok(sw.includes('"./' + e.animacion + '"'), 'falta ' + e.animacion + ' en ASSETS de sw.js');
  });
});

// El iPhone 11 de Esteban tiene poca memoria: cada animación se mantiene liviana.
test('ninguna animación pesa más de 250 KB', () => {
  rutina.ejercicios.forEach((e) => {
    if (!e.animacion) return;
    const kb = readFileSync(join(ROOT, e.animacion)).length / 1024;
    assert.ok(kb <= 250, e.animacion + ' pesa ' + Math.round(kb) + ' KB');
  });
});

test('validateRoutine detecta los errores típicos de una edición a mano', () => {
  const mala = {
    vueltas: 0,
    ejercicios: [
      { id: 'a', nombre: 'A', pasos: ['x'], dosis: { tipo: 'reps', min: 10, max: 5 } },
      { id: 'a', nombre: '', pasos: [], dosis: { tipo: 'series' }, animacion: 'https://x.com/a.gif' }
    ]
  };
  const e = validateRoutine(mala).join(' | ');
  assert.match(e, /vueltas/);
  assert.match(e, /min\/max/);
  assert.match(e, /id repetido/);
  assert.match(e, /falta nombre/);
  assert.match(e, /faltan pasos/);
  assert.match(e, /dosis\.tipo/);
  assert.match(e, /media\/movilidad/);
});

test('buildSteps repite los ejercicios en cada vuelta, en orden', () => {
  const r = { vueltas: 2, ejercicios: [{ id: 'a' }, { id: 'b' }] };
  const p = buildSteps(r);
  assert.deepEqual(p.map((x) => x.ejercicio.id + x.vuelta + '·' + x.posicion), ['a1·1', 'b1·2', 'a2·1', 'b2·2']);
  assert.deepEqual(p.map((x) => x.indice), [0, 1, 2, 3]);
});

test('dosisText arma el texto de repeticiones y de tiempo', () => {
  assert.equal(dosisText({ tipo: 'reps', min: 5, max: 10, unidad: 'por lado' }), '5–10 por lado');
  assert.equal(dosisText({ tipo: 'reps', min: 6, max: 6, unidad: 'en cada dirección' }), '6 en cada dirección');
  assert.equal(dosisText({ tipo: 'reps', min: 5, max: 10, unidad: '' }), '5–10 repeticiones');
  assert.equal(dosisText({ tipo: 'tiempo', segundos: 45 }), '45 s');
});

test('addMobilityDay agrega el día local sin duplicar y descarta basura', () => {
  const ts = new Date(2026, 9, 15, 21, 30).getTime(); // 9:30 p. m.: sigue siendo el 15 local
  const r = addMobilityDay(['2026-10-14', 'basura', null, '2026-10-15'], ts);
  assert.deepEqual(r, ['2026-10-14', '2026-10-15']);
  assert.deepEqual(addMobilityDay(undefined, ts), ['2026-10-15']);
});

test('addMobilityDay no crece para siempre', () => {
  const dias = [];
  for (let i = 0; i < 500; i++) dias.push('2025-' + String(1 + Math.floor(i / 28) % 12).padStart(2, '0') + '-' + String(1 + (i % 28)).padStart(2, '0'));
  assert.ok(addMobilityDay(dias, Date.now()).length <= 400);
});

test('estimateMinutes da una cifra razonable para la rutina real', () => {
  const m = estimateMinutes(rutina);
  assert.ok(m >= 10 && m <= 30, 'estimación fuera de rango: ' + m);
});
