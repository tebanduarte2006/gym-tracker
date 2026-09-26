# Convenciones: una sola forma de hacer cada cosa

Este archivo aplica la **regla dorada** de CLAUDE.md §0: el proyecto tiene una estructura fija y cada problema recurrente se resuelve siempre de la misma manera. Así cualquier agente, de hoy o de un modelo futuro, escribe código que se parece al que ya existe y la app no se degrada.

**Cómo usarlo**:
- Antes de crear algo, busca aquí su patrón y **cópialo**. No inventes una segunda forma de algo que ya está resuelto.
- Si de verdad no hay patrón, créalo, agrégalo aquí y anota el porqué en `proyecto/decisiones.md`.
- Si crees que un patrón es malo, no lo esquives en un solo lugar: propón cambiarlo **en todo el proyecto** a la vez, o déjalo como está.

## Mapa de archivos

```
index.html            Shell estático (título, pestañas, esqueleto) + vigilante de arranque (script CLÁSICO) + <script type="module">
styles.css            Todo el diseño: tokens en :root (claro) y prefers-color-scheme: dark, clases g-*
fonts/                Atkinson Hyperlegible Next (woff2 local, licencia OFL)
manifest.json         PWA (es-CO, standalone, iconos 192/512/maskable)
sw.js                 Service worker: CACHE versionado, ASSETS, responde VERSION y SKIP_WAITING
js/
  main.js             Arranque, pestañas (switchTab), ofertas de seed y de migración de músculos
  swupdate.js         Registro del SW, detección y aplicación de versiones, APP_VERSION
  db.js               IndexedDB: una conexión cacheada (withDB), bulk import transaccional, preferencias
  dom.js              el() / clear() / toast() / guard() / sinMovimiento()
  format.js           [PURO] kg↔lbs, fechas es-CO, duraciones, normalizeKey
  stats.js            [PURO] isCountable, PR, Epley, volumen, autollenado, set fantasma, resumen semanal
  plates.js           [PURO] calculadora de discos (enteros de 0,2 lb)
  muscles.js          [PURO] 18 músculos + migración del etiquetado viejo
  importer.js         [PURO] backups v2 (habitos-app) y v3 (nativo), PREFS_IMPORTABLES
  audio.js            Alarma de descanso (clip WAV generado por <audio> + Web Audio de respaldo)
  wakelock.js         Screen Wake Lock durante la sesión
  resttimer.js        Descanso por timestamp fijo
  ui/entrenar.js      Pestaña Entrenar (sesión activa, sets, cardio, finalizar)
  ui/ejercicios.js    Pestaña Ejercicios (directorio, crear/editar, selector de músculos)
  ui/progresion.js    Pestaña Progresión (hero, PR, gráfica, alarma, exportar/importar)
  ui/modals.js        Bottom sheets, confirmaciones, autocompletar
  ui/icons.js         Iconos SVG inline
  ui/dragorder.js     Reordenar por pulsación larga + arrastre
tests/                node --test, uno por módulo puro
scripts/              check-syntax.mjs (npm run check), capturas-iphone.mjs (capturas y verificación)
data/seed.json        Backup real de habitos-app: datos de prueba
icons/                Iconos y splashes. NO regenerar sin que Esteban lo pida
docs/                 Índice, rutas por tarea, convenciones, memoria del proyecto, guías para Esteban
graphify-out/         Mapa del código (graphify). Se actualiza con `graphify update .`
```

## Dónde va cada cosa

| Qué | Dónde | Patrón a copiar |
|---|---|---|
| Cálculo (PR, volumen, fechas, unidades) | Módulo puro `js/<tema>.js`: sin DOM ni IndexedDB | `js/plates.js` → `plateBreakdown` |
| Prueba automática | `tests/<tema>.test.js` con `node:test` | `tests/plates.test.js` |
| Leer o escribir datos | Funciones de `js/db.js` (`dbGet`, `dbPut`, `dbGetAllBy`…) | Nunca `indexedDB.open` fuera de `db.js` |
| Preferencia nueva | `prefGet` / `prefSet` + agregarla a `PREFS_IMPORTABLES` en `js/importer.js` | `alarma_fondo` |
| Cambio de esquema | Subir `DB_VERSION`, migrar en `onupgradeneeded`, actualizar `importer.js` + pruebas + `rutas/datos-y-respaldos.md`, todo en el mismo commit | — |
| Pantalla o sección | La pestaña en `js/ui/`; su `render*` **devuelve una promesa** que resuelve con los datos ya en el DOM | `renderEjercicios` |
| Hoja modal (bottom sheet) | `sheet()` de `js/ui/modals.js`; confirmaciones con `confirmAction` | `openRestModal` |
| Crear DOM | `el()` de `js/dom.js`. **Nunca `innerHTML`** (no tiene puerta trasera de HTML, a propósito) | — |
| Promesa de IndexedDB que alimenta la interfaz | Pasa por `guard()` de `js/dom.js`: error visible en un aviso, nunca pantalla en blanco | — |
| Aviso corto | `toast(mensaje, acción opcional)`. Nada de `alert` | Deshacer al borrar un set |
| Botón que guarda o crea algo (contra el doble toque) | `once(boton, acción)` de `js/ui/modals.js` | `openRenameModal` |
| Actualizar una tarjeta | Su `updateSets()` interno (render quirúrgico). **Nunca** re-renderizar la lista entera por una acción puntual | `buildExerciseCard` |
| Estilos | `styles.css`, clases `g-*`, colores solo por variables `--color-*` | — |
| Colores de SVG | Clases CSS (`.g-chart-*`); el JS pone clases, nunca `setAttribute('fill', '#…')` | `buildChart` |
| Espera programada en JS alrededor de una animación | Consultar `sinMovimiento()` | cierre del sheet |
| Archivo nuevo servido a la app | Agregarlo a `ASSETS` en `sw.js` | — |
| Script de verificación | `scripts/`; las capturas nuevas se agregan a `capturas-iphone.mjs`, no a otro script | — |
| Documentación de un área | `docs/rutas/<tema>.md` + fila en `docs/00-INDICE.md` | `rutas/entrenar.md` |

## Reglas de código

- **Nombres**: la mayoría de funciones están en inglés (`refreshExercises`, `buildSetRow`) y algunas heredadas en español (`sinMovimiento`, `colapsable`). **Nuevas: en inglés**, largas y claras. No renombres las existentes de paso. **Comentarios y textos de la interfaz en español**, explicando el porqué.
- **Peso**: se guarda SIEMPRE en kg (`inputToKg`), se muestra en lbs (`fmtWeight`). Chequear `null` antes de convertir: `Number(null) === 0` (lección 4).
- **Contar sets**: solo `isCountable` (= `Done`). Nunca `!== 'Pending'` (lección 3).
- **Comparar nombres escritos a mano** (días, rutinas): `normalizeKey`, y mejor aún, elegir de una lista (lección 30).
- **Tiempo**: todo conteo contra un timestamp fijo, nunca un `setInterval` que descuenta (lección 2).
- **Colores y letra**: solo variables de `styles.css`. Un color escrito a mano en JS o en una regla suelta sobrevive a todos los rediseños (lección 24). Letra única: Atkinson Hyperlegible Next.
- **Movimiento**: `--ease` para lo que se desplaza, `--ease-size` para lo que cambia de tamaño; nada por encima de 300 ms. Detalle en `rutas/movimiento-y-transiciones.md`.
- **Un dato, un cálculo**: si dos pantallas muestran lo mismo, usan la misma función (lección 14). Si un dato es igual para todas las filas, se carga una vez arriba y se pasa hacia abajo (lección 23).
- **Patrón defectuoso**: cuando arregles uno, busca TODAS sus apariciones (lección 19).
- **Cambios quirúrgicos**: un propósito por commit, sin refactors de paso. Lo que veas y no te pidieron va a `proyecto/progreso.md`.
- **Multiplataforma**: nada de rutas absolutas de un equipo ni comandos exclusivos de macOS en scripts del repo.
- **Dependencias**: ninguna. Ni npm, ni CDN, ni fuentes remotas. Una excepción exige permiso de Esteban y una entrada en `proyecto/decisiones.md`.

## Verificar (no negociable)

- `npm test` y `npm run check` en verde antes de cada commit. El CI los repite.
- **Nada táctil se da por bueno probándolo con el ratón.** Gestos, scroll y áreas de toque se verifican con eventos táctiles reales (`Input.dispatchTouchEvent` por CDP, contexto `devices['iPhone 11']` con `hasTouch: true`). Nació de tres fallos seguidos que pasaron la verificación en escritorio y llegaron rotos al iPhone (lección 44). Si no puedes probarlo así, dilo en la entrega.
- Una afirmación medible se mide: áreas táctiles con `elementFromPoint`, fluidez con el incremento por frame (lecciones 51 y 59).
- Cambios de interfaz: `node scripts/capturas-iphone.mjs` y mirar las capturas, en claro y oscuro.

## Instrucciones para Esteban

- Su iPhone está **en inglés**. En los pasos, los nombres de iOS van en inglés y en negrilla tal como aparecen (**Settings**, **Share** → **Add to Home Screen**). Los textos de la app van en español, como se ven (**Progresión** → **DATOS** → **Buscar actualización**).
- Pasos numerados, uno por acción, diciendo qué debe aparecer en pantalla después.
- Si no pudiste comprobar el nombre exacto de un botón de iOS, dilo en "Qué no pude comprobar".

## Commits y ramas

- Mensaje con el formato que ya usa el repo: `tipo(área): qué y por qué`, en español (`fix(entrenar): las tarjetas ya no se abren solas`). Tipos: `feat`, `fix`, `perf`, `docs`, `chore`.
- Una rama por tarea; merge automático según CLAUDE.md §5. Sin `--amend`, `push --force` ni `--no-verify`.
