# Ruta: progresión, estadísticas y cálculos

## Qué es
La pestaña Progresión (hero semanal, PR doble peso/reps, gráfica SVG, cardio y sets por músculo de la semana; la alarma, exportar/importar y la versión pasaron a Ajustes el 2026-10-02) y los cálculos puros que la alimentan, junto con la calculadora de discos.

## Archivos y funciones
| Dónde | Qué |
|---|---|
| `js/ui/progresion.js` | `renderProgresion` (devuelve promesa), `buildHero`, `buildMuscleCard`, `renderDetail`, `buildChart` (colores por clases `.g-chart-*`, nunca `setAttribute` con color), `buildSessionDetails` |
| `js/stats.js` [puro] | `isCountable` (**solo `Done` cuenta**), `weightPR`, `repsPR`, `epley1RM`, `volumeKg`, `sessionRows`, `sessionTs`, `weekSummary`, `setsPerMuscle`, `markRunningPRs` |
| `js/plates.js` [puro] | `plateBreakdown`: discos por lado en **enteros de 0,2 lb** (lección 26), barra en `bar_lbs` |
| `js/format.js` [puro] | `kgToLbs`, `fmtWeight` (muestra `—` con null: lección 4), fechas es-CO, `fmtDuration` |

## Reglas
- **Solo sets `Done` cuentan** para PR, 1RM, volumen y gráficas. Peso 0 con reps > 0 es válido (peso corporal): no "arreglar" filtrando por peso > 0. Un filtro `!== Pending` no es `=== Done` (lección 3).
- **Un solo criterio por dato**: si dos pantallas muestran el mismo PR, lo calcula la misma función con el mismo filtro (lección 14).
- Peso guardado en kg, mostrado en lbs (ver convenciones.md, "Peso").
- Toda lógica de cálculo nueva va a un módulo puro con su prueba.

## Cómo probar
`npm test` → `tests/stats.test.js`, `tests/plates.test.js`, `tests/format.test.js`.

## Lecciones que aplican
3, 4, 14, 23, 24, 26.

## graphify
`graphify explain "renderProgresion"` · `graphify explain "buildChart"` · `graphify explain "isCountable"` · `graphify explain "plateBreakdown"`
