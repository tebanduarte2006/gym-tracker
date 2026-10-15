# Ruta: movilidad (rutina guiada con animaciones)

## Qué es
Una rutina de movilidad aparte del entrenamiento de fuerza. Se abre con el botón **Movilidad** del inicio de Entrenar (debajo de **▶ Iniciar sesión**). Primero hay una portada con la lista, y después un paso por pantalla: animación en bucle, nombre, dosis, instrucciones y **Anterior / Siguiente**. Esteban la sigue con el teléfono en el piso. Al terminar solo se guarda **el día**, y la tarjeta **ÚLTIMOS 7 DÍAS** lo marca con un punto pequeño.

**Esteban la refina con el tiempo pidiéndoselo a un agente.** No hay editor en la app (misma regla que "sin plantillas", `decisiones.md` 2026-08-12). Las fuentes, la evidencia y el registro de cambios de la rutina están en [../movilidad/fuentes-y-proceso.md](../movilidad/fuentes-y-proceso.md): **léelo antes de cambiar un ejercicio.**

## Archivos y funciones
| Dónde | Qué |
|---|---|
| `data/movilidad.json` | La rutina: `vueltas`, `fuente` y `ejercicios[]` con `id`, `nombre`, `zona`, `dosis` (`{tipo:"reps",min,max,unidad}` o `{tipo:"tiempo",segundos}`), `pasos[]`, `animacion` (ruta en `media/movilidad/` o `null`) y `credito` |
| `media/movilidad/` | Animaciones: WebP animado (o PNG fijo), 360×360, ≤ 250 KB cada una |
| `js/mobility.js` [puro] | `buildSteps` (rutina → pasos por vuelta), `dosisText`, `estimateMinutes`, `addMobilityDay`, `validateRoutine`, `MOBILITY_PREF` |
| `js/format.js` | `dayKey` (día local `YYYY-MM-DD`) |
| `js/ui/movilidad.js` | `renderMobility` (portada), `renderStep` (un paso), `buildTimer` (cronómetro de los pasos con tiempo), `finish`, `mobilityProgress` |
| `js/ui/entrenar.js` | `renderStartScreen` (botón y su texto en `mobilityLabel`), `buildWeekCard` (punto de movilidad) |
| `js/stats.js` | `weekSummary` devuelve `clave` por día para cruzarlo con los días de movilidad |

## Reglas
- **Cambiar la rutina = editar `data/movilidad.json`**, y nada más. `tests/mobility.test.js` valida la forma, que cada animación exista, que esté en `ASSETS` y que pese ≤ 250 KB.
- **Animación nueva**: archivo en `media/movilidad/` + su línea en `ASSETS` de `sw.js` + `animacion` en el JSON. La receta está en `fuentes-y-proceso.md` §3.
- **WebP animado en `<img>`, no `<video>`** (decisión 2026-10-15): no depende de que el service worker responda pedidos por rangos, sigue animando con el modo de bajo consumo y no hay que tocar nada para que arranque.
- **Una sola animación decodificada a la vez** (un paso por pantalla). El iPhone 11 tiene poca memoria: no pongas animaciones en la portada ni en listas.
- **El progreso vive en memoria** (`_run`): salir con ‹ o cambiar de pestaña no lo pierde, y el botón del inicio dice **continuar (n de m)**. Por eso salir no pide confirmación (`diseno-ios.md` D10).
- **Solo se guarda el día**, en la preferencia `movilidad_dias` (lista `YYYY-MM-DD`, máximo 400). Está en `PREFS_IMPORTABLES`, así que viaja en el respaldo dentro de `preferencias`, y el formato del export no cambia. No crea sesiones ni sets: no cuenta para PR, volumen ni gráficas.
- **El botón Movilidad es secundario**: la acción principal del inicio es entrenar (D9). En el paso, la principal es **Siguiente**.
- **Botones pegados abajo** (`.g-mob-nav` sticky encima de la barra de pestañas) y la animación con tope `36vh`: un paso se pasa sin tener que bajar la pantalla.
- **El cronómetro** cuenta contra un timestamp fijo (lección 2) y al terminar suena `beep()` de `audio.js`.

## Cómo probar
- `npm test` → `tests/mobility.test.js`, más `weekSummary` en `tests/stats.test.js`.
- `node scripts/capturas-iphone.mjs` → `02a-movilidad-portada`, `02b-movilidad-paso` y `02c-movilidad-cronometro`, en claro, en oscuro y con texto grande; comprueba además que el botón ofrezca continuar. Todo con `tap` (eventos táctiles).
- En el iPhone: lista de `docs/esteban/pruebas-iphone.md`, sección **Movilidad**.

## Lecciones que aplican
2, 27, 44 (`docs/proyecto/lecciones.md`).

## graphify
`graphify explain "renderMobility"` · `graphify explain "renderStep"` · `graphify explain "buildSteps"` · `graphify explain "mobilityLabel"`
