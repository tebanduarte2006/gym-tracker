import test from 'node:test';
import assert from 'node:assert/strict';
import { plateBreakdown, DEFAULT_BAR_LBS, DEFAULT_PLATES_LBS } from '../js/plates.js';

const suma = (r) => r.perSide.reduce((s, p) => s + p.disco * p.cantidad, 0);

test('plateBreakdown descompone 135 lbs en un disco de 45 por lado', () => {
  const r = plateBreakdown(135, DEFAULT_BAR_LBS);
  assert.equal(r.error, null);
  assert.deepEqual(r.perSide, [{ disco: 45, cantidad: 1 }]);
  assert.equal(r.totalLbs, 135);
  assert.ok(r.exacto);
  assert.equal(r.restoLbs, 0);
});

test('plateBreakdown usa el disco más grande primero', () => {
  const r = plateBreakdown(225, DEFAULT_BAR_LBS);
  assert.deepEqual(r.perSide, [{ disco: 45, cantidad: 2 }]);
  assert.ok(r.exacto);
});

test('plateBreakdown combina discos distintos', () => {
  const r = plateBreakdown(185, DEFAULT_BAR_LBS);
  // (185 − 45) / 2 = 70 por lado = 45 + 25
  assert.deepEqual(r.perSide, [{ disco: 45, cantidad: 1 }, { disco: 25, cantidad: 1 }]);
  assert.equal(suma(r), 70);
  assert.ok(r.exacto);
});

test('plateBreakdown resuelve el 2.5 sin residuo de coma flotante', () => {
  // (50 − 45) / 2 = 2.5 exacto. Con aritmética flotante ingenua queda 1e-15.
  const r = plateBreakdown(50, DEFAULT_BAR_LBS);
  assert.deepEqual(r.perSide, [{ disco: 2.5, cantidad: 1 }]);
  assert.ok(r.exacto, 'debe ser exacto, no "sobra 0.0"');
  assert.equal(r.restoLbs, 0);
});

test('plateBreakdown acumula varios 2.5 sin perder precisión', () => {
  // (60 − 45) / 2 = 7.5 = 5 + 2.5
  const r = plateBreakdown(60, DEFAULT_BAR_LBS);
  assert.deepEqual(r.perSide, [{ disco: 5, cantidad: 1 }, { disco: 2.5, cantidad: 1 }]);
  assert.ok(r.exacto);
});

test('plateBreakdown reporta el sobrante cuando el peso no es alcanzable', () => {
  // (100 − 45) / 2 = 27.5 → 25 + 2.5 = 27.5 exacto; probamos uno que sí sobre.
  const r = plateBreakdown(46, DEFAULT_BAR_LBS);
  assert.equal(r.perSide.length, 0);
  assert.equal(r.exacto, false);
  assert.equal(r.restoLbs, 0.5);
  assert.equal(r.totalLbs, 45, 'lo alcanzable es la barra sola');
});

test('plateBreakdown avisa si el objetivo es menor que la barra', () => {
  const r = plateBreakdown(30, DEFAULT_BAR_LBS);
  assert.ok(r.error);
  assert.equal(r.perSide.length, 0);
});

test('plateBreakdown con el peso exacto de la barra no pide discos', () => {
  const r = plateBreakdown(45, DEFAULT_BAR_LBS);
  assert.equal(r.error, null);
  assert.deepEqual(r.perSide, []);
  assert.ok(r.exacto);
  assert.equal(r.totalLbs, 45);
});

test('plateBreakdown rechaza pesos inválidos', () => {
  assert.ok(plateBreakdown(0, 45).error);
  assert.ok(plateBreakdown(NaN, 45).error);
  assert.ok(plateBreakdown(135, -1).error);
});

test('plateBreakdown respeta una barra distinta', () => {
  const r = plateBreakdown(125, 35);
  // (125 − 35) / 2 = 45 por lado
  assert.deepEqual(r.perSide, [{ disco: 45, cantidad: 1 }]);
  assert.equal(r.totalLbs, 125);
});

test('plateBreakdown respeta un juego de discos limitado', () => {
  const r = plateBreakdown(135, DEFAULT_BAR_LBS, [25, 10, 5]);
  // 45 por lado con solo 25/10/5 = 25 + 10 + 10
  assert.deepEqual(r.perSide, [{ disco: 25, cantidad: 1 }, { disco: 10, cantidad: 2 }]);
  assert.ok(r.exacto);
});

test('DEFAULT_PLATES_LBS va de mayor a menor', () => {
  const ordenado = DEFAULT_PLATES_LBS.slice().sort((a, b) => b - a);
  assert.deepEqual(DEFAULT_PLATES_LBS, ordenado);
});
