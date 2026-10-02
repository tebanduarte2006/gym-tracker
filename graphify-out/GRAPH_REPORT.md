# Graph Report - gym-tracker  (2026-10-02)

## Corpus Check
- 53 files · ~63,667 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: (none) 2, .css 1)

## Summary
- 489 nodes · 1498 edges · 30 communities (27 shown, 3 thin omitted)
- Extraction: 86% EXTRACTED · 14% INFERRED · 0% AMBIGUOUS · INFERRED: 217 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `30d129c0`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- el
- capturas-iphone.mjs
- progresion.js
- Archivos y funciones
- Reglas obligatorias
- refreshExercises
- Registro de decisiones
- swupdate.js
- 00-INDICE.md
- manifest.json
- gym-tracker: reglas para agentes
- Guía de vibe coding para gym-tracker
- Ruta: interfaz y diseño
- Ruta: datos, IndexedDB y respaldos
- package.json
- Pruebas en el iPhone
- entrenar.js
- Ruta: ejercicios y taxonomía de músculos
- Índice: por dónde empezar según la tarea
- muscles.test.js
- plateBreakdown
- Ruta: progresión, estadísticas y cálculos
- Ruta: publicar y verificar
- Cómo trabajar en este proyecto (vibe coding, lo esencial)
- theme.js
- importer.js
- Lineamientos de diseño iOS (Apple HIG) para Plata y Gym Tracker
- Ruta: movimiento y transiciones

## God Nodes (most connected - your core abstractions)
1. `el()` - 71 edges
2. `guard()` - 48 edges
3. `dbGetAll()` - 32 edges
4. `toast()` - 31 edges
5. `clear()` - 30 edges
6. `Archivos y funciones` - 28 edges
7. `sheet()` - 27 edges
8. `renderSessionDetail()` - 26 edges
9. `dbPut()` - 24 edges
10. `buildExerciseCard()` - 24 edges

## Surprising Connections (you probably didn't know these)
- `D8. "Deshacer" no se va con un reloj` --references--> `toast()`  [INFERRED]
  docs/diseno-ios.md → js/dom.js
- `D6. Reducir movimiento` --references--> `sinMovimiento()`  [INFERRED]
  docs/diseno-ios.md → js/dom.js
- `Qué es` --references--> `exportData()`  [INFERRED]
  docs/rutas/datos-y-respaldos.md → js/ui/ajustes.js
- `Render quirúrgico (regla de UI)` --references--> `updateSets()`  [INFERRED]
  docs/rutas/entrenar.md → js/ui/entrenar.js
- `D7. Volver y Cerrar son símbolos, no palabras` --references--> `backButton()`  [INFERRED]
  docs/diseno-ios.md → js/ui/icons.js

## Import Cycles
- None detected.

## Communities (30 total, 3 thin omitted)

### Community 0 - "el"
Cohesion: 0.16
Nodes (52): Dónde va cada cosa, Lecciones aprendidas, Archivos y funciones, Archivos y funciones, Reglas (2026-09-13), Cómo construirla, dbBulkImport(), dbPut() (+44 more)

### Community 1 - "capturas-iphone.mjs"
Cohesion: 0.12
Nodes (9): { chromium, devices }, errores, fallas, informe, RAIZ, servidor, TIPOS, jsFiles() (+1 more)

### Community 2 - "progresion.js"
Cohesion: 0.14
Nodes (40): Historial de cambios, Cómo probar, Archivos y funciones, fmtDateLong(), fmtDateShort(), fmtHourMin(), fmtInt(), fmtWeight() (+32 more)

### Community 3 - "Archivos y funciones"
Cohesion: 0.14
Nodes (31): Alarma de descanso (reescrita el 2026-09-13), Archivos y funciones, Cómo probar, graphify, Lecciones que aplican, Qué es, Reglas de producto, Ruta: descanso, alarma y pantalla encendida (+23 more)

### Community 4 - "Reglas obligatorias"
Cohesion: 0.13
Nodes (15): D10. No confirmar lo que se puede deshacer, D11. El color nunca es la única señal, D12. Cada control propio tiene estado presionado y nombre para VoiceOver, D13. Márgenes seguros y barra de estado visible, D14. Textos: sentence case en español, verbos en los botones y errores que dicen cómo arreglar, D1. Área táctil de 44×44, o 28×28 si es una excepción anotada, D2. El texto sigue el tamaño elegido en el iPhone (Dynamic Type), D3. Ningún texto por debajo de 11 puntos; el cuerpo normal es de 17 (+7 more)

### Community 5 - "refreshExercises"
Cohesion: 0.06
Nodes (41): Commits y ramas, Convenciones: una sola forma de hacer cada cosa, Instrucciones para Esteban, Mapa de archivos, Reglas de código, Verificar (no negociable), Estado (2026-09-26), Ideas anotadas (sin compromiso; requieren OK de Esteban) (+33 more)

### Community 6 - "Registro de decisiones"
Cohesion: 0.09
Nodes (22): 2026-07-28 · Descanso: 90 s por defecto, configurable por ejercicio o por sesión, 2026-07-28 · Nace gym-tracker, separado de habitos-app, 2026-07-28 · Solo sets `Done` cuentan para PR, volumen y gráficas, 2026-07-28 · Stack: HTML + CSS + JS vanilla con ES modules, sin dependencias, 2026-07-28 · Unidades: guardar en kg, mostrar en lbs, teclear en ambas, 2026-08-02 · Actualización automática, nunca reinstalar, 2026-08-12 · Autollenado desde la última sesión, NO plantillas, 2026-08-12 · Estética "Vidrio Negro" (reemplazada el 2026-09-26) (+14 more)

### Community 7 - "swupdate.js"
Cohesion: 0.19
Nodes (17): Actualizaciones automáticas (nunca hay que reinstalar la PWA), Archivos y funciones, Arranque (por qué index.html NO está vacío), Cómo probar, graphify, Lecciones que aplican, Qué es, Reglas (+9 more)

### Community 9 - "manifest.json"
Cohesion: 0.17
Nodes (11): background_color, description, display, icons, lang, name, orientation, scope (+3 more)

### Community 10 - "gym-tracker: reglas para agentes"
Cohesion: 0.18
Nodes (11): 0. Regla dorada: estandarizar (antes de escribir una línea), 1. Quién es el dueño y qué quiere, 2. Cómo comunicarte con Esteban, 3. Ahorro de tokens: lee solo lo necesario, 4. Flujo de trabajo estándar, 5. Merge automático: autorización permanente de Esteban, 6. Reglas técnicas (resumen; detalle en `docs/convenciones.md`), 7. graphify (mapa del código, ahorra tokens) (+3 more)

### Community 11 - "Guía de vibe coding para gym-tracker"
Cohesion: 0.20
Nodes (10): 0. La idea en una frase, 1. Cómo pedir algo: cuatro partes, 2. Pasos pequeños y verificables, 3. La documentación que el agente mantiene, 4. Git sin tecnicismos: nunca perder trabajo, 5. Verificar sin saber programar, 6. Patrones de falla y cómo detectarlos, 7. Plantilla para pedir una función nueva (+2 more)

### Community 12 - "Ruta: interfaz y diseño"
Cohesion: 0.18
Nodes (11): Archivos, Cómo probar, graphify, Lecciones que aplican, Pendiente de confirmar en el iPhone, Qué es, Reglas, Ruta: interfaz y diseño (+3 more)

### Community 13 - "Ruta: datos, IndexedDB y respaldos"
Cohesion: 0.25
Nodes (8): Cómo probar, Esquema IndexedDB (`gymtracker-db` v1), graphify, Lecciones que aplican, Qué es, Reglas, Riesgo abierto, Ruta: datos, IndexedDB y respaldos

### Community 14 - "package.json"
Cohesion: 0.25
Nodes (7): description, name, private, scripts, check, test, type

### Community 15 - "Pruebas en el iPhone"
Cohesion: 0.22
Nodes (9): Actualizaciones (nunca reinstalar), Ajustes y Apariencia (2026-10-02), Arranque, Descanso y alarma, Entrenar, Pruebas en el iPhone, Reglas de Apple (2026-10-02), Respaldo (pendiente) (+1 more)

### Community 16 - "entrenar.js"
Cohesion: 0.13
Nodes (47): Archivos y funciones, dbDelete(), dbDeleteSessionCascade(), dbGet(), dbGetAll(), dbGetAllBy(), openDB(), reqToPromise() (+39 more)

### Community 17 - "Ruta: ejercicios y taxonomía de músculos"
Cohesion: 0.29
Nodes (6): Cómo probar, graphify, Lecciones que aplican, Qué es, Ruta: ejercicios y taxonomía de músculos, Taxonomía de músculos (2026-08-12)

### Community 18 - "Índice: por dónde empezar según la tarea"
Cohesion: 0.33
Nodes (6): Antes de escribir código, Documentos para Esteban (lenguaje sencillo), Mantener este índice, Memoria del proyecto, Referencias viejas "README §N", Índice: por dónde empezar según la tarea

### Community 19 - "muscles.test.js"
Cohesion: 0.25
Nodes (16): Archivos y funciones, CANON, canonicalizeExercise(), canonicalMuscle(), isCanonical(), isVagueRegion(), key(), MUSCLE_GROUPS (+8 more)

### Community 20 - "plateBreakdown"
Cohesion: 0.23
Nodes (4): ALARM_PATTERN_SEC, DEFAULT_BAR_LBS, DEFAULT_PLATES_LBS, plateBreakdown()

### Community 21 - "Ruta: progresión, estadísticas y cálculos"
Cohesion: 0.29
Nodes (6): Cómo probar, graphify, Lecciones que aplican, Qué es, Reglas, Ruta: progresión, estadísticas y cálculos

### Community 22 - "Ruta: publicar y verificar"
Cohesion: 0.33
Nodes (6): Cómo se publica hoy, Lecciones que aplican, Pasos de cada entrega, Ruta: publicar y verificar, Verificar en el iPhone (lo hace Esteban), Verificar en navegador

### Community 23 - "Cómo trabajar en este proyecto (vibe coding, lo esencial)"
Cohesion: 0.33
Nodes (6): 1. Cada pedido tiene cuatro partes, 2. Rutina de cada sesión, 3. Señales de alarma, Cómo trabajar en este proyecto (vibe coding, lo esencial), Estado, Gym Tracker

### Community 24 - "theme.js"
Cohesion: 0.33
Nodes (9): applyThemePreference(), darkModeQuery(), readThemePreference(), saveThemePreference(), startThemeSync(), THEME_COLORS, THEME_LABELS, THEME_STORAGE_KEY (+1 more)

### Community 25 - "importer.js"
Cohesion: 0.39
Nodes (7): buildExport(), EXPORT_VERSION, normalizeBackup(), parseMuscles(), PREFS_IMPORTABLES, toKg(), ROOT

### Community 28 - "Lineamientos de diseño iOS (Apple HIG) para Plata y Gym Tracker"
Cohesion: 0.40
Nodes (5): Cómo traducir la HIG a una app web, Excepciones conscientes (decisiones de Esteban), Lineamientos de diseño iOS (Apple HIG) para Plata y Gym Tracker, Pendientes conocidos (no se cumplen todavía), done()

### Community 29 - "Ruta: movimiento y transiciones"
Cohesion: 0.40
Nodes (5): Cómo probar, graphify, Lecciones que aplican, Qué es, Ruta: movimiento y transiciones

## Knowledge Gaps
- **168 isolated node(s):** `PULSOS`, `MESES`, `TABS`, `RENOMBRES`, `REGIONES` (+163 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 180 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `el()` connect `el` to `progresion.js`, `Archivos y funciones`, `refreshExercises`, `swupdate.js`, `gym-tracker: reglas para agentes`, `entrenar.js`, `muscles.test.js`, `theme.js`?**
  _High betweenness centrality (0.084) - this node is a cross-community bridge._
- **Why does `Historial de cambios` connect `progresion.js` to `el`, `Archivos y funciones`, `refreshExercises`, `swupdate.js`, `00-INDICE.md`, `entrenar.js`?**
  _High betweenness centrality (0.082) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `el()` (e.g. with `6. Reglas técnicas (resumen; detalle en `docs/convenciones.md`)` and `Dónde va cada cosa`) actually correct?**
  _`el()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `guard()` (e.g. with `6. Reglas técnicas (resumen; detalle en `docs/convenciones.md`)` and `Dónde va cada cosa`) actually correct?**
  _`guard()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `clear()` (e.g. with `Historial de cambios` and `Reglas (2026-09-13)`) actually correct?**
  _`clear()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `PULSOS`, `MESES`, `TABS` to the rest of the system?**
  _168 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `capturas-iphone.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.12280701754385964 - nodes in this community are weakly interconnected._