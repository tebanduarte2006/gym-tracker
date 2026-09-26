# Ruta: entrenar (sesión activa, sets, autollenado)

## Qué es
La pestaña Entrenar: pantalla de inicio (últimos 7 días + sesiones recientes), elegir el día ("Upper A"), sesión activa con tarjetas de ejercicio, sets, cardio, finalizar. Es la pantalla que Esteban usa entre series, con prisa y el pulgar sudado: aquí cada error cuesta más.

## Archivos y funciones
| Dónde | Qué |
|---|---|
| `js/ui/entrenar.js` (1.550 líneas: **no lo leas entero**, usa `graphify explain`) | `renderEntrenar` (entrada, devuelve promesa), `renderStartScreen`, `showStartModal` (elegir día), `createSession`, `renderActiveSession`, `refreshExercises` (reconstruye la lista), `buildExerciseCard` (tarjeta con su `updateSets()` interno), `buildSetRow` / `buildAddSetRow`, `openEditSetModal`, `attachExercise`, `confirmFinalize` / `finalizeSession`, `colapsable` (abrir/cerrar tarjetas) |
| `js/stats.js` [puro] | `STATUS`, `isCountable`, `isPlaceholder`, `autofillPlan` (propuesta del día), `suggestNextSet` (set fantasma), `sessionName`, `weekSummary` |
| `js/format.js` [puro] | `inputToKg`, `fmtWeight`, `normalizeKey` (comparar nombres de días) |
| `js/ui/modals.js` | `sheet`, `confirmAction`, `once` (contra el doble toque) |
| Descanso, alarma y wake lock | ver [descanso-y-alarma.md](descanso-y-alarma.md) |
| Reordenar arrastrando | ver [gestos-y-reordenar.md](gestos-y-reordenar.md) |

## Render quirúrgico (regla de UI)

En sesión activa, agregar un set / cambiar un status actualiza **solo la card
afectada** (`updateSets()` interno de cada card). Jamás re-renderizar la lista
completa por una acción puntual: colapsa cards y cierra el teclado en pleno
entrenamiento (bug #1 de la app vieja).

## Modelo de sets: propuesto vs registrado (leer antes de tocar `entrenar.js`)

Cambio del 2026-08-12, pedido por Esteban con estas palabras: *"el verde de
'hecho' me parece innecesario, yo sé cuándo un set está hecho; es una función
heredada de un template de Notion obsoleto que no me gusta. También el de
pendiente."*

**Lo que se quitó:** los chips `Hecho / Pendiente / Saltado` y el ciclo de tres
estados que él ciclaba a mano. `Skipped` ya no se crea nunca (no había ni uno en
sus 578 sets históricos; solo sigue en `STATUS` por si un backup viejo lo trae).

**Lo que NO se puede quitar, y por qué.** Con el autollenado, al empezar el
entrenamiento la pantalla ya muestra sets que todavía no has hecho. Si la app
cuenta todo lo que ve, un PR de 275×9 aparece por el simple hecho de abrir la
app. La distinción sobrevive; lo que desapareció es **administrarla**:

| | Propuesto | Registrado |
|---|---|---|
| `status` en la DB | `Pending` | `Done` |
| De dónde sale | autollenado o "copiar sets" | lo tecleaste, o tocaste el botón |
| Aspecto | fila apagada, números en terciario | fondo sólido, números en blanco |
| ¿Cuenta para PR/volumen? | **no** | sí |
| Al finalizar la sesión | se borra | se guarda |

**Registrar es un BOTÓN DEDICADO por fila (`.g-set-mark`), no tocar la fila.**
Decisión explícita de Esteban: *"mejor un botón dedicado a esto, más seguro y
previene accidentes"*. La fila entera es un blanco enorme para el pulgar y un
registro accidental contamina PRs y volumen sin que te enteres. **No lo
conviertas en "toca la fila" por elegancia.**

**Editar un set NO lo registra.** Cambiar un peso puede ser ajustar el plan
antes de levantarlo. Registrar es siempre un acto explícito.

**Consecuencia que hay que avisar, y se avisa.** Como el molde de la próxima vez
ES esta sesión, un ejercicio que termines sin ningún set registrado desaparece
de la propuesta de la semana que viene. Es lo que Esteban pidió (el plan se
corrige solo), pero encogería el entrenamiento en silencio y semanas después
— por eso el sheet de finalizar los nombra uno por uno. Si tocas ese aviso,
mantenlo: sin él, el modo de falla es invisible.

**Elegir la rutina, no escribirla.** El autollenado busca por `routine_type`
normalizado (sin tildes ni mayúsculas), pero la UI hace **elegir de una lista**
de días recientes. Escribir a mano permite que "Upper A" y "Upper A " sean días
distintos y te quedes sin propuesta sin entender por qué.

## Las tarjetas de ejercicio NO se abren solas (2026-09-13)

Esteban: *"quisiera que las tarjetas de los ejercicios estén cerradas por
defecto en todo momento, que la única razón por la que se abren es cuando YO las
toco. Es muy molesto: me salgo, o en un momento aleatorio, y se abre la del
primer ejercicio y me desconcentra."*

Había dos auto-aperturas, las dos con buena intención:

1. `createSession` abría el primer ejercicio del plan autollenado.
2. `refreshExercises` abría el primero **cada vez que no hubiera ninguna
   abierta**. Y `refreshExercises` corre en CADA vuelta al tab Entrenar, porque
   `switchTab` re-renderiza siempre. De ahí el "momento aleatorio": bastaba
   mirar Progresión y volver para que el ejercicio 1 se abriera solo.

Las dos fuera. El único código que abre una tarjeta es el `click` de su
cabecera, más `attachExercise` (acabas de agregar ESE ejercicio a la sesión: no
es la app decidiendo, es el resultado directo de tu toque). `_openEj` sigue
persistiendo entre renders, así que lo que tú abriste sigue abierto al volver.

**No lo devuelvas "por comodidad".** La comodidad de ahorrar un toque al empezar
cuesta un ejercicio que se abre solo en mitad de una serie, y esa cuenta ya se
hizo. Es la lección 43 aplicada hasta el final: un comportamiento correcto al
entrar a una pantalla sigue siendo incorrecto cada vez que se vuelve a ella, y
ninguna ventana de tiempo alrededor del render lo arregla — solo no hacerlo.

## Cómo probar
- `npm test` cubre `autofillPlan`, `isCountable`, `suggestNextSet`, `weekSummary` (`tests/stats.test.js`).
- En navegador: `node scripts/capturas-iphone.mjs` restaura el seed real y recorre la sesión activa (ver [publicar-y-verificar.md](publicar-y-verificar.md)). Cualquier cosa táctil: eventos táctiles reales, nunca el ratón (convenciones.md, "Verificar").

## Lecciones que aplican
3, 6, 7, 8, 23, 25, 28, 29, 30, 43 (`docs/proyecto/lecciones.md`).

## graphify
`graphify explain "refreshExercises"` · `graphify explain "buildExerciseCard"` · `graphify explain "autofillPlan"` · `graphify explain "finalizeSession"`
