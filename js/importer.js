// importer.js — normaliza backups a los records canónicos de gym-tracker.
// Módulo puro: sin DOM, sin IndexedDB. Testeable en Node.
//
// Acepta:
//   · v2 — backup de habitos-app ({version:2, sesiones, ejercicios, sets}).
//     Maneja TODA su deuda histórica:
//       - sets solo con `peso_lbs` (esquema pre-abril-2026, 167 en el backup
//         real de Esteban; la app vieja los mostraba como "—" y los excluía
//         de PR/gráficas) → se convierten a kg.
//       - sets sin `status` → Done.
//       - placeholders Pending 0/0 → se descartan.
//       - `musculo_primario` como JSON-string o string plano → array nativo.
//       - sesiones sin `routine_type` → null (se conservan).
//   · v3 — backup nativo de gym-tracker (incluye cardio y preferencias).
//
// Devuelve { sesiones, ejercicios, sets, cardio, warnings } con los datos
// listos para insertar. Lanza Error con mensaje claro si el shape no sirve.

import { KG_PER_LB } from './format.js';

export const EXPORT_VERSION = 3;

// Claves de `preferencias` que un backup puede restaurar. Lista blanca a
// propósito: un archivo externo no debe inyectar configuración arbitraria.
// `bar_lbs`: peso de la barra de la calculadora de discos. Si no estuviera
// aquí, restaurar un backup en otro teléfono lo perdería en silencio — que es
// exactamente el bug que ya costó las preferencias enteras una vez.
export const PREFS_IMPORTABLES = new Set([
  'rest_default', 'contador_workouts', 'seed_decidido', 'bar_lbs', 'musculos_migrados'
]);

function parseMuscles(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean).map(String);
  if (typeof raw === 'string') {
    if (raw.charAt(0) === '[') {
      try {
        const a = JSON.parse(raw);
        return Array.isArray(a) ? a.filter(Boolean).map(String) : [raw];
      } catch {
        return [raw];
      }
    }
    return [raw];
  }
  return [String(raw)];
}

function toKg(set, warnings) {
  if (set.peso != null && isFinite(Number(set.peso))) return Number(set.peso);
  if (set.peso_lbs != null && isFinite(Number(set.peso_lbs))) {
    return Math.round(Number(set.peso_lbs) * KG_PER_LB * 1000) / 1000;
  }
  warnings.push(`set id=${set.id}: sin peso ni peso_lbs, se importa con peso 0`);
  return 0;
}

export function normalizeBackup(data) {
  if (!data || typeof data !== 'object') throw new Error('El archivo no es un backup válido.');
  if (data.version == null) throw new Error('El backup no declara versión.');
  const v = Number(data.version);
  if (v !== 2 && v !== EXPORT_VERSION) throw new Error(`Versión de backup no soportada: ${data.version}.`);
  for (const k of ['sesiones', 'ejercicios', 'sets']) {
    if (!Array.isArray(data[k])) throw new Error(`El backup no tiene la lista "${k}".`);
  }

  const warnings = [];

  const ejercicios = data.ejercicios.map((e) => ({
    id: e.id,
    nombre: String(e.nombre || '').trim(),
    musculos: parseMuscles(e.musculo_primario != null ? e.musculo_primario : e.musculos),
    tipo: e.tipo || null,
    rest_sec: isFinite(Number(e.rest_sec)) && Number(e.rest_sec) > 0 ? Number(e.rest_sec) : null,
    fecha_creacion: e.fecha_creacion || null
  }));

  const sesiones = data.sesiones.map((s) => ({
    id: s.id,
    nombre: s.nombre || 'Workout',
    fecha: s.fecha || null,
    timestamp_inicio: s.timestamp_inicio || (s.fecha ? new Date(s.fecha).getTime() : null),
    duracion_ms: s.duracion_ms || null,
    finalizada: s.finalizada === true,
    routine_type: s.routine_type || null,
    ej_orden: Array.isArray(s.ej_orden) ? s.ej_orden : null
  }));

  const sesIds = new Set(sesiones.map((s) => s.id));
  const ejIds = new Set(ejercicios.map((e) => e.id));

  const sets = [];
  let placeholders = 0, huerfanos = 0;
  data.sets.forEach((s) => {
    if (!sesIds.has(s.sesion_id) || !ejIds.has(s.ejercicio_id)) {
      huerfanos++;
      return;
    }
    const pesoKg = toKg(s, warnings);
    const reps = Number(s.reps) || 0;
    const status = s.status || 'Done';
    if (status === 'Pending' && pesoKg === 0 && reps === 0) {
      placeholders++;
      return;
    }
    sets.push({
      id: s.id,
      sesion_id: s.sesion_id,
      ejercicio_id: s.ejercicio_id,
      peso: pesoKg,
      reps,
      orden: s.orden || null,
      status,
      unidad: s.unidad || null,
      // `ts` se conserva: ordena la memoria de "última unidad usada por
      // ejercicio" y estima la duración al guardar una sesión olvidada.
      ts: s.ts != null && isFinite(Number(s.ts)) ? Number(s.ts) : null
    });
  });
  if (placeholders) warnings.push(`${placeholders} placeholders Pending 0/0 descartados`);
  if (huerfanos) warnings.push(`${huerfanos} sets huérfanos (sesión o ejercicio inexistente) descartados`);

  const cardio = Array.isArray(data.cardio)
    ? data.cardio
        .filter((c) => sesIds.has(c.sesion_id))
        .map((c) => ({
          id: c.id,
          sesion_id: c.sesion_id,
          tipo: String(c.tipo || '').trim() || 'Cardio',
          duracion_min: Number(c.duracion_min) || 0,
          velocidad_kmh: c.velocidad_kmh != null && isFinite(Number(c.velocidad_kmh)) ? Number(c.velocidad_kmh) : null,
          inclinacion: c.inclinacion != null && isFinite(Number(c.inclinacion)) ? Number(c.inclinacion) : null,
          orden: c.orden || null,
          ts: c.ts != null && isFinite(Number(c.ts)) ? Number(c.ts) : null
        }))
    : [];

  // Preferencias (solo v3). Se filtran a las claves conocidas: un backup no
  // debe poder inyectar basura en el store de configuración.
  const preferencias = Array.isArray(data.preferencias)
    ? data.preferencias
        .filter((p) => p && typeof p.clave === 'string' && PREFS_IMPORTABLES.has(p.clave))
        .map((p) => ({ clave: p.clave, valor: p.valor }))
    : [];
  if (Array.isArray(data.preferencias) && preferencias.length < data.preferencias.length) {
    warnings.push(`${data.preferencias.length - preferencias.length} preferencia(s) desconocida(s) ignorada(s)`);
  }

  return { version: v, sesiones, ejercicios, sets, cardio, preferencias, warnings };
}

export function buildExport({ sesiones, ejercicios, sets, cardio, preferencias }) {
  return {
    version: EXPORT_VERSION,
    app: 'gym-tracker',
    exportDate: new Date().toISOString(),
    sesiones: sesiones || [],
    ejercicios: ejercicios || [],
    sets: sets || [],
    cardio: cardio || [],
    preferencias: preferencias || []
  };
}
