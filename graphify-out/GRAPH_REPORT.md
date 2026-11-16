# Graph Report - gym-tracker  (2026-11-16)

## Corpus Check
- 64 files · ~83,713 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: (none) 2, .css 1)

## Summary
- 609 nodes · 1961 edges · 35 communities (29 shown, 6 thin omitted)
- Extraction: 86% EXTRACTED · 14% INFERRED · 0% AMBIGUOUS · INFERRED: 282 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `cda12ca3`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- el
- capturas-iphone.mjs
- el
- Archivos y funciones
- Reglas obligatorias
- enableDragOrder
- Registro de decisiones
- muscles.js
- manifest.json
- gym-tracker: reglas para agentes
- Guía de vibe coding para gym-tracker
- Pruebas en el iPhone
- movilidad.js
- package.json
- Progreso
- entrenar.js
- Ruta: datos, IndexedDB y respaldos
- Índice: por dónde empezar según la tarea
- boot
- theme.js
- Ruta: progresión, estadísticas y cálculos
- Ruta: publicar y verificar
- Cómo trabajar en este proyecto (vibe coding, lo esencial)
- rea
- Ruta: función nueva
- Investigación 2026-11: apps de gimnasio y widgets en iOS
- Movilidad: fuentes, evidencia y cómo mejorar la rutina
- importer.test.js
- Ruta: ejercicios y taxonomía de músculos
- Ruta: interfaz y diseño
- Lineamientos de diseño iOS (Apple HIG) para Plata y Gym Tracker
- ref_node_assert
- Convenciones: una sola forma de hacer cada cosa

## God Nodes (most connected - your core abstractions)
1. `el()` - 82 edges
2. `guard()` - 53 edges
3. `toast()` - 38 edges
4. `clear()` - 38 edges
5. `dbGetAll()` - 35 edges
6. `Registro de decisiones` - 31 edges
7. `sheet()` - 30 edges
8. `buildExerciseCard()` - 30 edges
9. `Archivos y funciones` - 30 edges
10. `normalizeKey()` - 28 edges

## Surprising Connections (you probably didn't know these)
- `2026-11-16 · Plantillas fijas por rutina (reemplaza en parte la de 2026-08-12)` --references--> `normalizeKey()`  [INFERRED]
  docs/proyecto/decisiones.md → js/format.js
- `2026-11-16 · Pestaña Ejercicios: Plantillas | Ejercicios, agrupada por grupo muscular` --references--> `attachExercise()`  [INFERRED]
  docs/proyecto/decisiones.md → js/ui/entrenar.js
- `Pendientes técnicos conocidos` --references--> `refreshExercises()`  [INFERRED]
  docs/proyecto/progreso.md → js/ui/entrenar.js
- `Cómo probar` --references--> `weekSummary()`  [INFERRED]
  docs/rutas/movilidad.md → js/stats.js
- `D8. "Deshacer" no se va con un reloj` --references--> `toast()`  [INFERRED]
  docs/diseno-ios.md → js/dom.js

## Import Cycles
- 2-file cycle: `js/ui/ejercicios.js -> js/ui/plantillas.js -> js/ui/ejercicios.js`

## Communities (35 total, 6 thin omitted)

### Community 0 - "el"
Cohesion: 0.14
Nodes (66): Archivos y funciones, Archivos y funciones, Plantillas (2026-11-16), Modelo de sets: propuesto vs registrado (leer antes de tocar `entrenar.js`), Cómo construirla, dbBulkImport(), dbGetAll(), prefGet() (+58 more)

### Community 1 - "capturas-iphone.mjs"
Cohesion: 0.13
Nodes (11): Reglas, capturar(), { chromium, devices }, errores, fallas, informe, RAIZ, restaurarSeed() (+3 more)

### Community 2 - "el"
Cohesion: 0.11
Nodes (47): 2026-10-04 · El autollenado propone ejercicios, no sets, Historial de cambios, Algoritmos de progresión publicados, Cómo funcionan las apps de gimnasio, Qué evitar (quejas de usuarios), Cómo probar, Archivos y funciones, Gráfica del ejercicio (2026-11-12) (+39 more)

### Community 3 - "Archivos y funciones"
Cohesion: 0.10
Nodes (40): Alarma de descanso (reescrita el 2026-09-13), Archivos y funciones, Barra de descanso, reloj de la tarjeta y pantalla bloqueada (2026-11-12), Cómo probar, graphify, Lecciones que aplican, Qué es, Reglas de producto (+32 more)

### Community 4 - "Reglas obligatorias"
Cohesion: 0.13
Nodes (15): D10. No confirmar lo que se puede deshacer, D11. El color nunca es la única señal, D12. Cada control propio tiene estado presionado y nombre para VoiceOver, D13. Márgenes seguros y barra de estado visible, D14. Textos: sentence case en español, verbos en los botones y errores que dicen cómo arreglar, D1. Área táctil de 44×44, o 28×28 si es una excepción anotada, D2. El texto sigue el tamaño elegido en el iPhone (Dynamic Type), D3. Ningún texto por debajo de 11 puntos; el cuerpo normal es de 17 (+7 more)

### Community 5 - "enableDragOrder"
Cohesion: 0.13
Nodes (22): Archivos y funciones, Cómo probar, Gestos táctiles en iOS (leer antes de tocar cualquier gesto), graphify, Lecciones que aplican, Qué es, Reordenar arrastrando (`js/ui/dragorder.js`), Ruta: reordenar arrastrando y gestos táctiles en iOS (+14 more)

### Community 6 - "Registro de decisiones"
Cohesion: 0.07
Nodes (30): 2026-07-28 · Descanso: 90 s por defecto, configurable por ejercicio o por sesión, 2026-07-28 · Nace gym-tracker, separado de habitos-app, 2026-07-28 · Solo sets `Done` cuentan para PR, volumen y gráficas, 2026-07-28 · Stack: HTML + CSS + JS vanilla con ES modules, sin dependencias, 2026-07-28 · Unidades: guardar en kg, mostrar en lbs, teclear en ambas, 2026-08-02 · Actualización automática, nunca reinstalar, 2026-08-12 · Autollenado desde la última sesión, NO plantillas (reemplazada en parte el 2026-11-16), 2026-08-12 · Estética "Vidrio Negro" (reemplazada el 2026-09-26) (+22 more)

### Community 7 - "muscles.js"
Cohesion: 0.18
Nodes (20): Cómo probar, BORRAR_2026_11, CANON, canonicalizeExercise(), canonicalMuscle(), exerciseGroup(), isCanonical(), isVagueRegion() (+12 more)

### Community 9 - "manifest.json"
Cohesion: 0.17
Nodes (11): background_color, description, display, icons, lang, name, orientation, scope (+3 more)

### Community 10 - "gym-tracker: reglas para agentes"
Cohesion: 0.17
Nodes (11): 0. Regla dorada: estandarizar (antes de escribir una línea), 1. Quién es el dueño y qué quiere, 2. Cómo comunicarte con Esteban, 3. Ahorro de tokens: lee solo lo necesario, 4. Flujo de trabajo estándar, 5. Merge automático: autorización permanente de Esteban, 6. Reglas técnicas (resumen; detalle en `docs/convenciones.md`), 7. graphify (mapa del código, ahorra tokens) (+3 more)

### Community 11 - "Guía de vibe coding para gym-tracker"
Cohesion: 0.20
Nodes (10): 0. La idea en una frase, 1. Cómo pedir algo: cuatro partes, 2. Pasos pequeños y verificables, 3. La documentación que el agente mantiene, 4. Git sin tecnicismos: nunca perder trabajo, 5. Verificar sin saber programar, 6. Patrones de falla y cómo detectarlos, 7. Plantilla para pedir una función nueva (+2 more)

### Community 12 - "Pruebas en el iPhone"
Cohesion: 0.14
Nodes (14): Actualizaciones (nunca reinstalar), Ajustes y Apariencia (2026-10-02), Arranque, Buscador, récords, descanso y discos (pendiente, 2026-11-12), Descanso y alarma, Entrenar, Movilidad con énfasis en el hombro (pendiente, 2026-11-16), Movilidad (pendiente, 2026-10-15) (+6 more)

### Community 13 - "movilidad.js"
Cohesion: 0.18
Nodes (25): Archivos y funciones, dayKey(), addMobilityDay(), buildSteps(), dosisText(), estimateMinutes(), MOBILITY_PREF, validateRoutine() (+17 more)

### Community 14 - "package.json"
Cohesion: 0.25
Nodes (7): description, name, private, scripts, check, test, type

### Community 15 - "Progreso"
Cohesion: 0.33
Nodes (6): Estado (2026-11-16), Ideas anotadas (sin compromiso; requieren OK de Esteban), Lo que sigue, Pendiente de probar en el iPhone (Esteban), Pendientes técnicos conocidos, Progreso

### Community 16 - "entrenar.js"
Cohesion: 0.08
Nodes (70): Dónde va cada cosa, Reglas de código, Agregar ejercicio, récords y discos (2026-11-12), Archivos y funciones, graphify, Las tarjetas de ejercicio NO se abren solas (2026-09-13), Lecciones que aplican, Qué es (+62 more)

### Community 17 - "Ruta: datos, IndexedDB y respaldos"
Cohesion: 0.25
Nodes (8): Cómo probar, Esquema IndexedDB (`gymtracker-db` v1), graphify, Lecciones que aplican, Qué es, Reglas, Riesgo abierto, Ruta: datos, IndexedDB y respaldos

### Community 18 - "Índice: por dónde empezar según la tarea"
Cohesion: 0.33
Nodes (6): Antes de escribir código, Documentos para Esteban (lenguaje sencillo), Mantener este índice, Memoria del proyecto, Referencias viejas "README §N", Índice: por dónde empezar según la tarea

### Community 19 - "boot"
Cohesion: 0.10
Nodes (35): Lecciones aprendidas, Actualizaciones automáticas (nunca hay que reinstalar la PWA), Archivos y funciones, Arranque (por qué index.html NO está vacío), Cómo probar, graphify, Lecciones que aplican, Qué es (+27 more)

### Community 20 - "theme.js"
Cohesion: 0.33
Nodes (9): applyThemePreference(), darkModeQuery(), readThemePreference(), saveThemePreference(), startThemeSync(), THEME_COLORS, THEME_LABELS, THEME_STORAGE_KEY (+1 more)

### Community 21 - "Ruta: progresión, estadísticas y cálculos"
Cohesion: 0.29
Nodes (6): Cómo probar, graphify, Lecciones que aplican, Qué es, Reglas, Ruta: progresión, estadísticas y cálculos

### Community 22 - "Ruta: publicar y verificar"
Cohesion: 0.33
Nodes (6): Cómo se publica hoy, Lecciones que aplican, Pasos de cada entrega, Ruta: publicar y verificar, Verificar en el iPhone (lo hace Esteban), Verificar en navegador

### Community 23 - "Cómo trabajar en este proyecto (vibe coding, lo esencial)"
Cohesion: 0.33
Nodes (6): 1. Cada pedido tiene cuatro partes, 2. Rutina de cada sesión, 3. Señales de alarma, Cómo trabajar en este proyecto (vibe coding, lo esencial), Estado, Gym Tracker

### Community 28 - "Movilidad: fuentes, evidencia y cómo mejorar la rutina"
Cohesion: 0.20
Nodes (10): 1. Proceso estándar para cambiar la rutina, 2. Evidencia (qué sabemos y qué no), 3. Dónde conseguir animaciones (de mejor a peor), 4. Sacar el contenido de un video sin verlo, 5. Ideas para después (sin compromiso), 6. Registro de cambios de la rutina, 7. Hombros de Esteban: test y fisioterapia (2026-11-16), Movilidad: fuentes, evidencia y cómo mejorar la rutina (+2 more)

### Community 29 - "importer.test.js"
Cohesion: 0.22
Nodes (5): EXPORT_VERSION, PREFS_IMPORTABLES, jsFiles(), ROOT, ROOT

### Community 30 - "Ruta: ejercicios y taxonomía de músculos"
Cohesion: 0.25
Nodes (7): Directorio por grupo muscular (2026-11-16), graphify, Lecciones que aplican, Qué es, Revisión de noviembre de 2026, Ruta: ejercicios y taxonomía de músculos, Taxonomía de músculos (2026-08-12)

### Community 31 - "Ruta: interfaz y diseño"
Cohesion: 0.25
Nodes (8): Archivos, Cómo probar, graphify, Lecciones que aplican, Pendiente de confirmar en el iPhone, Qué es, Ruta: interfaz y diseño, Tokens (usa estos nombres; no hay otros)

### Community 32 - "Lineamientos de diseño iOS (Apple HIG) para Plata y Gym Tracker"
Cohesion: 0.33
Nodes (5): Cómo traducir la HIG a una app web, Excepciones conscientes (decisiones de Esteban), Lineamientos de diseño iOS (Apple HIG) para Plata y Gym Tracker, Pendientes conocidos (no se cumplen todavía), done()

### Community 34 - "Convenciones: una sola forma de hacer cada cosa"
Cohesion: 0.40
Nodes (5): Commits y ramas, Convenciones: una sola forma de hacer cada cosa, Instrucciones para Esteban, Mapa de archivos, Verificar (no negociable)

## Knowledge Gaps
- **1 isolated node(s):** `npx`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 217 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Registro de decisiones` connect `Registro de decisiones` to `00-INDICE.md`, `el`?**
  _High betweenness centrality (0.086) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `el()` (e.g. with `6. Reglas técnicas (resumen; detalle en `docs/convenciones.md`)` and `Dónde va cada cosa`) actually correct?**
  _`el()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `npx` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `el` be split into smaller, more focused modules?**
  _Cohesion score 0.136986301369863 - nodes in this community are weakly interconnected._
- **Why does `el()` connect `el` to `el`, `Archivos y funciones`, `gym-tracker: reglas para agentes`, `movilidad.js`, `entrenar.js`, `boot`, `theme.js`?**
  _High betweenness centrality (0.076) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `guard()` (e.g. with `6. Reglas técnicas (resumen; detalle en `docs/convenciones.md`)` and `Dónde va cada cosa`) actually correct?**
  _`guard()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `capturas-iphone.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.1323529411764706 - nodes in this community are weakly interconnected._