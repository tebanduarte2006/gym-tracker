import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  kgToLbs, inputToKg, fmtWeight, parseDecimal, fmtDuration, fmtHourMin,
  normalizeKey, fmtDateShort, tsToDatetimeLocal
} from '../js/format.js';

test('kgToLbs redondea a 1 decimal', () => {
  assert.equal(kgToLbs(29.483), 65);
  assert.equal(kgToLbs(0), 0);
  assert.equal(kgToLbs(undefined), null);
  assert.equal(kgToLbs('x'), null);
});

test('inputToKg convierte lbs y respeta kg', () => {
  assert.equal(inputToKg(100, 'lbs'), 45.359);
  assert.equal(inputToKg(100, 'kg'), 100);
  assert.ok(Number.isNaN(inputToKg('abc', 'kg')));
  assert.ok(Number.isNaN(inputToKg(-5, 'kg')));
});

test('roundtrip lbs → kg → lbs es estable', () => {
  for (const lbs of [2.5, 5, 10, 25, 45, 65, 135, 225, 315]) {
    assert.equal(kgToLbs(inputToKg(lbs, 'lbs')), lbs);
  }
});

test('roundtrip kg → kg vía display no pierde el valor guardado', () => {
  const kg = inputToKg(12.5, 'kg');
  assert.equal(kg, 12.5);
  assert.equal(kgToLbs(kg), 27.6);
});

test('parseDecimal acepta coma y punto', () => {
  assert.equal(parseDecimal('12,5'), 12.5);
  assert.equal(parseDecimal('12.5'), 12.5);
  assert.equal(parseDecimal(' 8 '), 8);
  assert.ok(Number.isNaN(parseDecimal('')));
});

test('fmtWeight muestra — sin dato', () => {
  assert.equal(fmtWeight(null), '—');
  assert.equal(fmtWeight(29.483), '65');
});

test('fmtDuration', () => {
  assert.equal(fmtDuration(0), '00:00');
  assert.equal(fmtDuration(61000), '01:01');
  assert.equal(fmtDuration(3661000), '1:01:01');
  assert.equal(fmtDuration(-5), '0:00');
});

test('fmtHourMin', () => {
  assert.equal(fmtHourMin(0), '0m');
  assert.equal(fmtHourMin(45 * 60000), '45m');
  assert.equal(fmtHourMin(95 * 60000), '1h 35m');
});

test('normalizeKey quita acentos y case', () => {
  assert.equal(normalizeKey('Tríceps'), 'triceps');
  assert.equal(normalizeKey('  CUÁDRICEPS '), 'cuadriceps');
  assert.equal(normalizeKey(null), '');
});

test('fmtDateShort', () => {
  assert.equal(fmtDateShort('2026-07-28T12:00:00'), '28 jul');
  assert.equal(fmtDateShort(null), '');
});

test('tsToDatetimeLocal produce formato input datetime-local', () => {
  const s = tsToDatetimeLocal(new Date(2026, 6, 28, 9, 5).getTime());
  assert.equal(s, '2026-07-28T09:05');
});
