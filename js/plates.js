// plates.js — calculadora de discos. Módulo PURO: sin DOM, sin IndexedDB.
//
// Traído de Strong/Hevy, que es lo que más citan sus usuarios: le dices el peso
// total y te dice qué poner a cada lado de la barra, para no hacer la cuenta
// entre serie y serie.
//
// Trabaja en LIBRAS a propósito, no en kg: los discos del gimnasio de Esteban
// están marcados en libras y el objetivo es que pueda leer el resultado y
// cogerlos sin traducir nada. La regla de "peso canónico en kg" (README §2.12)
// aplica al ALMACENAMIENTO; esto es display puro y no toca la base de datos.

export const DEFAULT_BAR_LBS = 45;

// Juego estándar de un gimnasio comercial, de mayor a menor.
export const DEFAULT_PLATES_LBS = [45, 35, 25, 10, 5, 2.5];

// Descompone `targetLbs` en discos POR LADO sobre una barra de `barLbs`.
//
// Devuelve { perSide, usedLbs, totalLbs, restoLbs, exacto, error }:
//   · perSide  [{ disco, cantidad }] de mayor a menor
//   · usedLbs  peso real que suman los discos de UN lado
//   · totalLbs peso real alcanzado (barra + ambos lados)
//   · restoLbs lo que falta por lado para llegar al objetivo (0 si es exacto)
//   · exacto   true si los discos dan el peso pedido sin sobra
//   · error    mensaje si el objetivo no es alcanzable, null si va bien
export function plateBreakdown(targetLbs, barLbs, plates) {
  const target = Number(targetLbs);
  const bar = Number(barLbs != null ? barLbs : DEFAULT_BAR_LBS);
  const juego = (plates && plates.length ? plates.slice() : DEFAULT_PLATES_LBS.slice())
    .map(Number)
    .filter((p) => isFinite(p) && p > 0)
    .sort((a, b) => b - a);

  if (!isFinite(target) || target <= 0) {
    return { perSide: [], usedLbs: 0, totalLbs: 0, restoLbs: 0, exacto: false, error: 'Escribe un peso válido.' };
  }
  if (!isFinite(bar) || bar < 0) {
    return { perSide: [], usedLbs: 0, totalLbs: 0, restoLbs: 0, exacto: false, error: 'Peso de barra inválido.' };
  }
  if (target < bar) {
    return {
      perSide: [], usedLbs: 0, totalLbs: bar, restoLbs: 0, exacto: false,
      error: 'La barra sola ya pesa ' + bar + ' lbs.'
    };
  }

  // Se trabaja en décimas de libra en entero: 2.5 + 2.5 + 2.5 en coma flotante
  // deja residuos de 1e-15 que convierten un resultado exacto en "sobra 0.0".
  let restante = Math.round((target - bar) * 5); // unidades de 0.2 lb
  const perSide = [];
  juego.forEach((disco) => {
    const paso = Math.round(disco * 2 * 5); // el disco va a los DOS lados
    if (paso <= 0 || restante < paso) return;
    const cantidad = Math.floor(restante / paso);
    if (cantidad > 0) {
      perSide.push({ disco, cantidad });
      restante -= cantidad * paso;
    }
  });

  const usedLbs = perSide.reduce((sum, p) => sum + p.disco * p.cantidad, 0);
  const restoLbs = Math.round((restante / 5 / 2) * 100) / 100;
  return {
    perSide,
    usedLbs: Math.round(usedLbs * 100) / 100,
    totalLbs: Math.round((bar + usedLbs * 2) * 100) / 100,
    restoLbs,
    exacto: restante === 0,
    error: null
  };
}
