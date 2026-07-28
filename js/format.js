// format.js — conversiones de unidades y formato de fechas/duraciones.
// Módulo puro: sin DOM, sin IndexedDB. Testeable en Node.

export const KG_PER_LB = 0.45359237;

export function kgToLbs(kg) {
  if (kg == null || kg === '') return null; // Number(null) sería 0: dato ausente ≠ 0 lbs
  const n = Number(kg);
  if (!isFinite(n)) return null;
  return Math.round((n / KG_PER_LB) * 10) / 10;
}

export function inputToKg(value, unit) {
  const n = Number(value);
  if (!isFinite(n) || n < 0) return NaN;
  const kg = unit === 'kg' ? n : n * KG_PER_LB;
  return Math.round(kg * 1000) / 1000;
}

// Peso para mostrar: siempre lbs con 1 decimal máx. "—" si no hay dato.
export function fmtWeight(kg) {
  const lbs = kgToLbs(kg);
  return lbs === null ? '—' : String(lbs);
}

// Acepta "12,5" o "12.5". NaN si no es número.
export function parseDecimal(raw) {
  const s = String(raw == null ? '' : raw).replace(',', '.').trim();
  if (!s) return NaN;
  return parseFloat(s);
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function fmtDateShort(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return d.getDate() + ' ' + MESES[d.getMonth()];
}

export function fmtDateLong(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return d.getDate() + ' ' + MESES[d.getMonth()] + ' ' + d.getFullYear();
}

export function fmtDuration(ms) {
  if (!isFinite(ms) || ms < 0) return '0:00';
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => (n < 10 ? '0' + n : '' + n);
  return (h > 0 ? h + ':' + pad(m) : pad(m)) + ':' + pad(s);
}

export function fmtHourMin(ms) {
  if (!isFinite(ms) || ms <= 0) return '0m';
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return m + 'm';
  return h + 'h ' + (m < 10 ? '0' + m : m) + 'm';
}

export function fmtInt(n) {
  return Number(n || 0).toLocaleString('es-CO');
}

// Normaliza para búsqueda: sin acentos, minúsculas, sin espacios extremos.
export function normalizeKey(s) {
  if (!s) return '';
  return String(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export function tsToDatetimeLocal(ms) {
  const d = new Date(ms);
  const pad = (n) => (n < 10 ? '0' + n : '' + n);
  return (
    d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
    'T' + pad(d.getHours()) + ':' + pad(d.getMinutes())
  );
}
