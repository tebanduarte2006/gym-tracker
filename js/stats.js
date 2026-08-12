// stats.js — cálculos de progresión: PRs, 1RM, volumen, agrupaciones.
// Módulo puro: sin DOM, sin IndexedDB. Testeable en Node.
//
// REGLA DURA: solo los sets con status "Done" cuentan para PR, 1RM, volumen
// y gráficas. Un set Skipped o Pending NO es trabajo realizado.
// (Bug heredado de habitos-app: filtraba `!== Pending` y los Skipped
// contaminaban los récords.)

import { normalizeKey } from './format.js';

// `SKIPPED` sigue existiendo solo para no romper un backup antiguo que lo traiga.
// La app YA NO lo crea ni lo muestra: desde el 2026-08-12 un set solo puede
// estar propuesto (Pending) o registrado (Done). Ver README §5.2.
export const STATUS = { PENDING: 'Pending', DONE: 'Done', SKIPPED: 'Skipped' };

// Un set "cuenta" si está hecho y tiene reps reales. peso 0 es válido
// (ejercicios de peso corporal), por eso NO se filtra por peso > 0.
export function isCountable(set) {
  const status = set.status || STATUS.DONE; // legacy sin status = Done
  return status === STATUS.DONE && Number(set.reps) > 0 && isFinite(Number(set.peso));
}

// Placeholder técnico que ancla un ejercicio a la sesión sin sets aún.
export function isPlaceholder(set) {
  return set.status === STATUS.PENDING && Number(set.peso) === 0 && Number(set.reps) === 0;
}

// Sets visibles en UI: todo menos placeholders.
export function visibleSets(sets) {
  return sets.filter((s) => !isPlaceholder(s));
}

// PR por peso: set Done con mayor peso; empate → más reps.
export function weightPR(sets) {
  const done = sets.filter(isCountable);
  if (done.length === 0) return null;
  return done.reduce((m, s) => {
    if (Number(s.peso) > Number(m.peso)) return s;
    if (Number(s.peso) === Number(m.peso) && Number(s.reps) > Number(m.reps)) return s;
    return m;
  });
}

// PR por reps: set Done con más reps; empate → más peso.
export function repsPR(sets) {
  const done = sets.filter(isCountable);
  if (done.length === 0) return null;
  return done.reduce((m, s) => {
    if (Number(s.reps) > Number(m.reps)) return s;
    if (Number(s.reps) === Number(m.reps) && Number(s.peso) > Number(m.peso)) return s;
    return m;
  });
}

// 1RM estimado (Epley) sobre el peso en la unidad que se le pase.
export function epley1RM(weight, reps) {
  const w = Number(weight), r = Number(reps);
  if (!isFinite(w) || !isFinite(r) || r <= 0) return null;
  return Math.round(w * (1 + r / 30));
}

// Volumen (kg) = suma peso×reps de sets Done.
export function volumeKg(sets) {
  return sets.filter(isCountable).reduce((sum, s) => sum + Number(s.peso) * Number(s.reps), 0);
}

// Timestamp efectivo de una sesión.
export function sessionTs(sesion) {
  if (!sesion) return 0;
  if (sesion.timestamp_inicio) return sesion.timestamp_inicio;
  if (sesion.fecha) {
    const t = new Date(sesion.fecha).getTime();
    return isNaN(t) ? 0 : t;
  }
  return 0;
}

// Agrupa sets por sesión → filas ordenadas cronológicamente (asc).
// Solo sesiones finalizadas y sets contables. sesionMap: id → sesión.
export function sessionRows(sets, sesionMap) {
  const bySesion = {};
  sets.filter(isCountable).forEach((s) => {
    const ses = sesionMap[s.sesion_id];
    if (!ses || ses.finalizada !== true) return;
    (bySesion[s.sesion_id] = bySesion[s.sesion_id] || []).push(s);
  });
  return Object.keys(bySesion)
    .map((sid) => {
      const arr = bySesion[sid].slice().sort((a, b) => (a.orden || a.id) - (b.orden || b.id));
      const sesion = sesionMap[sid];
      const best = weightPR(arr);
      return {
        sesion,
        ts: sessionTs(sesion),
        sets: arr,
        maxPesoKg: arr.reduce((m, s) => Math.max(m, Number(s.peso) || 0), 0),
        bestSet: best,
        volumenKg: volumeKg(arr)
      };
    })
    .sort((a, b) => a.ts - b.ts);
}

// Nombre de una sesión para mostrar. El "Workout #N" era numeración heredada
// del template de Notion y Esteban lo quitó el 2026-08-12: no aportaba nada que
// la fecha no diga mejor. Se lee de `routine_type`, así que las sesiones
// ANTIGUAS también pierden el prefijo sin tocarles el dato guardado.
export function sessionName(sesion) {
  if (!sesion) return 'Workout';
  if (sesion.routine_type) return sesion.routine_type;
  // Historial anterior sin routine_type: se recorta el "Workout #12 · " si lo trae.
  const n = String(sesion.nombre || '').trim();
  const m = /^Workout #\d+\s*·\s*(.+)$/.exec(n);
  if (m) return m[1];
  return n || 'Workout';
}

// ─── Resumen de la semana (pantalla de inicio) ────────────────────────────────
// Antes esa pantalla era un 70% de negro vacío. Devuelve lo que se puede decir
// con datos que ya existen, sin pedir nada nuevo:
//   { sesiones, volumenKg, sets, dias: [{ letra, entrenado, hoy }] }
// `dias` son los últimos 7 terminando HOY, para una tira de actividad.
const LETRA_DIA = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

export function weekSummary(sesiones, sets, ahora) {
  const now = ahora != null ? ahora : Date.now();
  const hoy = new Date(now);
  hoy.setHours(0, 0, 0, 0);
  const inicioVentana = hoy.getTime() - 6 * 24 * 60 * 60 * 1000;

  const enSemana = new Set();
  (sesiones || []).forEach((s) => {
    if (s.finalizada !== true) return;
    const ts = sessionTs(s);
    if (!ts) return;
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    if (d.getTime() >= inicioVentana) enSemana.add(s.id);
  });

  let volumenKg = 0;
  let nSets = 0;
  (sets || []).forEach((s) => {
    if (!enSemana.has(s.sesion_id) || !isCountable(s)) return;
    volumenKg += Number(s.peso) * Number(s.reps);
    nSets += 1;
  });

  const conActividad = new Set();
  (sesiones || []).forEach((s) => {
    if (!enSemana.has(s.id)) return;
    const d = new Date(sessionTs(s));
    d.setHours(0, 0, 0, 0);
    conActividad.add(d.getTime());
  });

  const dias = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(hoy.getTime() - i * 24 * 60 * 60 * 1000);
    dias.push({
      letra: LETRA_DIA[d.getDay()],
      entrenado: conActividad.has(d.getTime()),
      hoy: i === 0
    });
  }

  return { sesiones: enSemana.size, volumenKg, sets: nSets, dias };
}

// ─── Set fantasma (sugerencia de la sesión anterior) ──────────────────────────
// Qué proponer para el próximo set: el set nº (ya registrados + 1) de la última
// sesión de ese ejercicio. Si aquella sesión tuvo menos series, se repite la
// última — que es lo razonable: si sigues añadiendo series, la referencia útil
// es la última que hiciste, no "nada".
// `prevSets` viene YA ordenado por `orden`. Devuelve { peso (kg), reps } o null.
export function suggestNextSet(prevSets, yaRegistrados) {
  if (!Array.isArray(prevSets) || prevSets.length === 0) return null;
  const n = Number(yaRegistrados);
  const idx = Math.min(isFinite(n) && n > 0 ? n : 0, prevSets.length - 1);
  const s = prevSets[idx];
  if (!s) return null;
  const peso = Number(s.peso);
  const reps = Number(s.reps);
  // peso 0 es válido (peso corporal); reps 0 no propone nada útil.
  if (!isFinite(peso) || peso < 0 || !(reps > 0)) return null;
  return { peso, reps };
}

// ─── Volumen por grupo muscular ───────────────────────────────────────────────
// Un ejercicio con varios músculos suma UN set a cada uno, sin repartir
// fracciones: un press de banca sí trabaja pecho Y tríceps en esa misma serie,
// y es como lo cuentan Hevy y Boostcamp. Por eso el total de sets por músculo
// puede superar el número real de series — es una medida de estímulo, no una
// partición. Solo entran sets Done (regla dura del módulo).
// `ejMap`: id → ejercicio. Devuelve [{ musculo, sets, volumenKg }] desc.
export function setsPerMuscle(sets, ejMap) {
  const acc = new Map();
  sets.filter(isCountable).forEach((s) => {
    const ej = ejMap ? ejMap[s.ejercicio_id] : null;
    const lista = ej && Array.isArray(ej.musculos) && ej.musculos.length > 0
      ? ej.musculos.filter(Boolean)
      : [];
    const musculos = lista.length > 0 ? lista : ['Sin músculo'];
    const vol = Number(s.peso) * Number(s.reps);
    musculos.forEach((m) => {
      const clave = String(m);
      const cur = acc.get(clave) || { musculo: clave, sets: 0, volumenKg: 0 };
      cur.sets += 1;
      cur.volumenKg += vol;
      acc.set(clave, cur);
    });
  });
  return [...acc.values()].sort((a, b) => b.sets - a.sets || a.musculo.localeCompare(b.musculo));
}

// ─── Autollenado desde la última sesión de la misma rutina ────────────────────
// El "template" de un día NO es una entidad guardada: es literalmente la última
// sesión finalizada con ese mismo `routine_type`. Lo que registras hoy es el
// molde de la próxima, sin nada que mantener a mano.
//
// El nombre de rutina se compara normalizado (sin tildes, sin mayúsculas, sin
// espacios sobrantes): "Upper A" y "upper a" son el mismo día. Aun así la UI
// hace elegir de una lista en vez de escribir — un dedazo no debe partir un día
// en dos y dejarte sin propuesta.
//
// Devuelve null si es la primera vez que haces esa rutina, o
// { sesion, ejercicios: [{ ejercicio_id, sets: [{ peso, reps, unidad }] }] }
// con los ejercicios en el orden de aquella sesión y SOLO sus sets registrados.
export function autofillPlan(routineType, sesiones, sets) {
  const key = normalizeKey(routineType);
  if (!key) return null;

  let pick = null;
  (sesiones || []).forEach((s) => {
    if (s.finalizada !== true) return;
    if (normalizeKey(s.routine_type) !== key) return;
    if (!pick || sessionTs(s) > sessionTs(pick)) pick = s;
  });
  if (!pick) return null;

  // Solo lo que de verdad hiciste: un set propuesto que no registraste no
  // debería volver a proponerse eternamente por inercia.
  const mios = (sets || [])
    .filter((s) => s.sesion_id === pick.id && isCountable(s))
    .slice()
    .sort((a, b) => (a.orden || a.id || 0) - (b.orden || b.id || 0));
  if (mios.length === 0) return null;

  const porEj = new Map();
  const aparicion = [];
  mios.forEach((s) => {
    if (!porEj.has(s.ejercicio_id)) { porEj.set(s.ejercicio_id, []); aparicion.push(s.ejercicio_id); }
    porEj.get(s.ejercicio_id).push(s);
  });

  const orden = Array.isArray(pick.ej_orden) && pick.ej_orden.length > 0
    ? pick.ej_orden.filter((id) => porEj.has(id))
    : [];
  aparicion.forEach((id) => { if (!orden.includes(id)) orden.push(id); });

  return {
    sesion: pick,
    ejercicios: orden.map((id) => ({
      ejercicio_id: id,
      sets: porEj.get(id).map((s) => ({
        peso: Number(s.peso),
        reps: Number(s.reps),
        unidad: s.unidad || null
      }))
    }))
  };
}

// Marca s._isPR (récord de peso en su momento) sobre filas cronológicas.
export function markRunningPRs(rows) {
  let runningMax = 0;
  rows.forEach((row) => {
    row.sets.forEach((s) => {
      const p = Number(s.peso);
      s._isPR = isCountable(s) && p > runningMax;
      if (s._isPR) runningMax = p;
    });
  });
  return rows;
}
