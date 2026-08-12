// muscles.js — taxonomía de músculos. Módulo PURO: sin DOM, sin IndexedDB.
//
// ─── Por qué existe esta lista ────────────────────────────────────────────────
// La lista vieja tenía tres defectos que Esteban veía como "músculos raros y
// duplicados" en el selector (reportado 2026-08-12):
//
//   1. NÚMERO INCONSISTENTE. La constante decía 'Aductores' y sus datos decían
//      'Aductor'; igual con 'Abductor(es)' y 'Trapecio(s)'. El selector añade los
//      músculos que descubre en la base a los de la constante, así que ambos
//      aparecían a la vez: dos filas casi idénticas que parecen un error.
//   2. GRANULARIDAD MEZCLADA. 'Espalda' convivía con 'Dorsales'; 'Hombros' con
//      'Hombro frontal'; 'Piernas' con 'Cuádriceps'; 'Core' con 'Abdominales'.
//      Poder marcar la región Y su parte hace que el volumen por músculo cuente
//      el mismo set dos veces y que dos filas del informe digan lo mismo.
//   3. ETIQUETAS VAGAS. 12 ejercicios estaban marcados solo como 'Espalda' u
//      'Hombros', que para decidir qué entrenar no dice nada.
//
// ─── La regla de la lista nueva ───────────────────────────────────────────────
// UN solo nivel de granularidad, y se separa un músculo de su vecino SOLO si esa
// separación cambia una decisión de entrenamiento. Por eso los deltoides van por
// sus tres cabezas (la trampa clásica es machacar el frontal y no tocar el
// posterior) pero el pecho no se parte en superior/inferior: eso es un asunto de
// ángulo, no de músculo, y obligaría a adivinar en cada ejercicio.
//
// Si añades un músculo, añádelo aquí y solo aquí. La UI lee de este módulo.

export const MUSCLE_GROUPS = [
  { grupo: 'Empuje', musculos: ['Pecho', 'Deltoides frontal', 'Deltoides lateral', 'Tríceps'] },
  { grupo: 'Tirón', musculos: ['Dorsales', 'Trapecios', 'Deltoides posterior', 'Bíceps', 'Antebrazos'] },
  { grupo: 'Core', musculos: ['Abdominales', 'Oblicuos', 'Lumbares'] },
  { grupo: 'Pierna', musculos: ['Cuádriceps', 'Isquiotibiales', 'Glúteos', 'Aductores', 'Abductores', 'Gemelos'] }
];

export const MUSCLES = MUSCLE_GROUPS.reduce((acc, g) => acc.concat(g.musculos), []);

// Normalizador local: este módulo no debe depender de format.js para algo tan
// pequeño, y así `muscles.js` se puede usar desde cualquier sitio.
function key(s) {
  return String(s == null ? '' : s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

const CANON = new Map(MUSCLES.map((m) => [key(m), m]));

// Renombres mecánicos: mismo músculo, otro nombre. No hay nada que decidir.
const RENOMBRES = {
  'aductor': 'Aductores',
  'abductor': 'Abductores',
  'trapecio': 'Trapecios',
  'romboides': 'Trapecios',
  'lumbar': 'Lumbares',
  'antebrazo': 'Antebrazos',
  'hombro frontal': 'Deltoides frontal',
  'hombro lateral': 'Deltoides lateral',
  'hombro posterior': 'Deltoides posterior',
  'deltoide frontal': 'Deltoides frontal',
  'deltoide lateral': 'Deltoides lateral',
  'deltoide posterior': 'Deltoides posterior',
  // El ángulo del banco no es un músculo distinto.
  'pecho superior': 'Pecho',
  'pecho inferior': 'Pecho'
};

// Regiones que abarcan varios músculos de la lista: no se pueden traducir solas,
// hay que mirar de qué ejercicio se trata.
const REGIONES = new Set(['espalda', 'hombros', 'hombro', 'piernas', 'pierna', 'core', 'tren superior', 'tren inferior']);

// Traducción por EJERCICIO de las regiones vagas del historial de Esteban.
// Tabla de una sola vez, para sus 36 ejercicios de agosto de 2026: un ejercicio
// nuevo se crea ya con la lista canónica y no necesita nada de esto.
//
// Criterio: se traduce lo que la etiqueta vaga YA significaba, y no se inventan
// músculos nuevos. 'Espalda' en un remo sí quiere decir dorsales y trapecios
// —eso es traducir—, pero añadirle 'Bíceps' sería una decisión de entrenamiento
// disfrazada de limpieza de datos, y le triplicaría el volumen de bíceps sin que
// entienda por qué.
const POR_EJERCICIO = {
  'incline press- smith': ['Pecho', 'Deltoides frontal', 'Tríceps'],
  'lat pull-down': ['Dorsales'],
  's/a dumbbell row': ['Dorsales', 'Trapecios'],
  'dumbbell high row + kelso al fallo': ['Trapecios', 'Deltoides posterior'],
  'reverse machine fly': ['Deltoides posterior', 'Trapecios'],
  'cable lateral raise': ['Deltoides lateral'],
  'dips': ['Pecho', 'Deltoides frontal', 'Tríceps'],
  'dumbbell shoulder press': ['Deltoides frontal', 'Deltoides lateral'],
  's/a pull-down': ['Dorsales'],
  'dumbbell incline chest press': ['Pecho', 'Deltoides frontal'],
  's/a cable row': ['Dorsales', 'Trapecios']
};

// ¿Este nombre ya es uno de los músculos canónicos?
export function isCanonical(musculo) {
  return CANON.has(key(musculo));
}

// Devuelve el nombre canónico de un músculo suelto, o null si no se puede
// resolver sin mirar el ejercicio (una región vaga o un nombre desconocido).
export function canonicalMuscle(musculo) {
  const k = key(musculo);
  if (!k) return null;
  if (CANON.has(k)) return CANON.get(k);
  if (RENOMBRES[k]) return RENOMBRES[k];
  return null;
}

// Traduce la lista de músculos de UN ejercicio a la taxonomía canónica.
// Devuelve { musculos, cambio, sinResolver }:
//   · musculos     lista final, sin duplicados y en el orden de MUSCLES
//   · cambio       true si difiere de la entrada
//   · sinResolver  nombres que no se pudieron traducir (quedan fuera)
export function canonicalizeExercise(nombre, musculos) {
  const original = (musculos || []).filter(Boolean).map(String);
  const override = POR_EJERCICIO[key(nombre)];
  const salida = new Set();
  const sinResolver = [];

  if (override) {
    override.forEach((m) => salida.add(m));
  } else {
    original.forEach((m) => {
      const c = canonicalMuscle(m);
      if (c) { salida.add(c); return; }
      // Una región vaga sin traducción por ejercicio no se adivina: adivinar mal
      // y escribirlo en el historial es peor que dejarlo pendiente de revisar.
      sinResolver.push(m);
    });
  }

  // Orden estable por la lista canónica: así dos ejercicios con los mismos
  // músculos los muestran siempre igual.
  const finales = MUSCLES.filter((m) => salida.has(m));
  const mismos = finales.length === original.length &&
    finales.every((m, i) => m === original[i]);

  return { musculos: finales, cambio: !mismos, sinResolver };
}

// Plan de migración de todo el directorio. Devuelve solo lo que cambia, para
// poder enseñárselo a Esteban ANTES de tocar su historial:
//   [{ id, nombre, antes, despues, sinResolver }]
export function planMuscleMigration(ejercicios) {
  const plan = [];
  (ejercicios || []).forEach((e) => {
    const antes = (e.musculos || []).filter(Boolean).map(String);
    const r = canonicalizeExercise(e.nombre, antes);
    if (!r.cambio && r.sinResolver.length === 0) return;
    plan.push({
      id: e.id,
      nombre: e.nombre,
      antes,
      despues: r.musculos,
      sinResolver: r.sinResolver
    });
  });
  return plan;
}

// ¿Hay algún músculo fuera de la taxonomía en todo el directorio? Lo usa el
// arranque para decidir si ofrecer la migración.
export function needsMuscleMigration(ejercicios) {
  return planMuscleMigration(ejercicios).length > 0;
}

// Regiones vagas, exportadas para que la UI pueda marcarlas como "revisar".
export function isVagueRegion(musculo) {
  return REGIONES.has(key(musculo));
}
