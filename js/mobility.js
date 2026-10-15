// mobility.js — [PURO] rutina de movilidad: pasos, textos y días hechos.
//
// La rutina vive en data/movilidad.json y la cambia un agente cuando Esteban lo
// pide (docs/rutas/movilidad.md). No hay editor en la app: es la misma regla
// que "sin plantillas" (docs/proyecto/decisiones.md, 2026-08-12).
//
// Lo único que se guarda es QUÉ DÍAS la hizo: la preferencia `movilidad_dias`,
// una lista de 'YYYY-MM-DD' en hora local. No cuenta para PR, volumen ni
// gráficas, y no toca sesiones ni sets.

import { dayKey } from './format.js';

export const MOBILITY_PREF = 'movilidad_dias';

// Un año y algo de días: suficiente para la tarjeta semanal y para cualquier
// vista futura, sin que la preferencia crezca para siempre.
const MAX_DIAS = 400;

// Agrega el día de `ts` sin duplicar. Devuelve una lista NUEVA, ordenada y
// recortada a los últimos MAX_DIAS. Tolera basura de un backup viejo.
export function addMobilityDay(dias, ts) {
  const set = new Set((Array.isArray(dias) ? dias : []).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)));
  set.add(dayKey(ts));
  return [...set].sort().slice(-MAX_DIAS);
}

// "5–10 por lado", "6 en cada dirección", "45 s".
export function dosisText(dosis) {
  if (!dosis) return '';
  if (dosis.tipo === 'tiempo') return dosis.segundos + ' s';
  const n = dosis.min === dosis.max ? String(dosis.min) : dosis.min + '–' + dosis.max;
  return dosis.unidad ? n + ' ' + dosis.unidad : n + ' repeticiones';
}

// La rutina aplanada en pasos: cada ejercicio una vez por vuelta.
// [{ ejercicio, vuelta (1..n), posicion (1..m), indice (0..total-1) }]
export function buildSteps(rutina) {
  const ejercicios = (rutina && rutina.ejercicios) || [];
  const vueltas = Math.max(1, Number(rutina && rutina.vueltas) || 1);
  const pasos = [];
  for (let v = 1; v <= vueltas; v++) {
    ejercicios.forEach((ejercicio, i) => {
      pasos.push({ ejercicio, vuelta: v, posicion: i + 1, indice: pasos.length });
    });
  }
  return pasos;
}

// Minutos aproximados para la pantalla de inicio de la rutina. Supuesto: cada
// repetición con su vuelta toma ~4 s (por lado si aplica) y hay ~10 s de
// transición por ejercicio. Es una estimación para orientar, no un cronómetro.
export function estimateMinutes(rutina) {
  let seg = 0;
  buildSteps(rutina).forEach(({ ejercicio }) => {
    const d = ejercicio.dosis || {};
    if (d.tipo === 'tiempo') seg += Number(d.segundos) || 0;
    else {
      const reps = Number(d.max) || 0;
      const lados = /por (lado|brazo|pierna)/.test(d.unidad || '') || /cada/.test(d.unidad || '') ? 2 : 1;
      seg += reps * 4 * lados;
    }
    seg += 10;
  });
  return Math.max(1, Math.round(seg / 60));
}

// Errores de forma de la rutina. Lo usan las pruebas: un agente que edite
// data/movilidad.json a mano se entera antes de publicar.
export function validateRoutine(rutina) {
  const errores = [];
  if (!rutina || typeof rutina !== 'object') return ['la rutina no es un objeto'];
  if (!(Number(rutina.vueltas) >= 1)) errores.push('vueltas debe ser 1 o más');
  if (!Array.isArray(rutina.ejercicios) || rutina.ejercicios.length === 0) {
    errores.push('no hay ejercicios');
    return errores;
  }
  const ids = new Set();
  rutina.ejercicios.forEach((e, i) => {
    const q = 'ejercicio ' + (i + 1) + ' (' + (e && e.id) + ')';
    if (!e || typeof e.id !== 'string' || !e.id) { errores.push(q + ': falta id'); return; }
    if (ids.has(e.id)) errores.push(q + ': id repetido');
    ids.add(e.id);
    if (!e.nombre) errores.push(q + ': falta nombre');
    if (!Array.isArray(e.pasos) || e.pasos.length === 0) errores.push(q + ': faltan pasos');
    const d = e.dosis || {};
    if (d.tipo === 'tiempo') {
      if (!(Number(d.segundos) > 0)) errores.push(q + ': segundos inválidos');
    } else if (d.tipo === 'reps') {
      if (!(Number(d.min) > 0) || !(Number(d.max) >= Number(d.min))) errores.push(q + ': min/max inválidos');
    } else {
      errores.push(q + ': dosis.tipo debe ser "reps" o "tiempo"');
    }
    if (e.animacion != null && !/^media\/movilidad\/[a-z0-9-]+\.(webp|png)$/.test(e.animacion)) {
      errores.push(q + ': animacion debe estar en media/movilidad/ (.webp o .png)');
    }
  });
  return errores;
}
