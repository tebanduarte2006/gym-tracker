# Graph Report - gym-tracker  (2026-11-12)

## Corpus Check
- 61 files · ~75,663 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: (none) 2, .css 1)

## Summary
- 566 nodes · 1742 edges · 29 communities (26 shown, 3 thin omitted)
- Extraction: 85% EXTRACTED · 15% INFERRED · 0% AMBIGUOUS · INFERRED: 254 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `009a0141`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- main.js
- capturas-iphone.mjs
- el
- Archivos y funciones
- Reglas obligatorias
- enableDragOrder
- Registro de decisiones
- Ruta: arranque y actualizaciones automáticas
- 00-INDICE.md
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
- modals.js
- Convenciones: una sola forma de hacer cada cosa
- Ruta: progresión, estadísticas y cálculos
- Ruta: publicar y verificar
- Cómo trabajar en este proyecto (vibe coding, lo esencial)
- rea
- Ruta: interfaz y diseño
- Cómo funcionan las apps de gimnasio
- Movilidad: fuentes, evidencia y cómo mejorar la rutina

## God Nodes (most connected - your core abstractions)
1. `el()` - 76 edges
2. `guard()` - 51 edges
3. `clear()` - 34 edges
4. `toast()` - 34 edges
5. `dbGetAll()` - 32 edges
6. `buildExerciseCard()` - 29 edges
7. `Archivos y funciones` - 28 edges
8. `sheet()` - 27 edges
9. `Registro de decisiones` - 27 edges
10. `renderSessionDetail()` - 26 edges

## Surprising Connections (you probably didn't know these)
- `Reglas` --references--> `beep()`  [INFERRED]
  docs/rutas/movilidad.md → js/audio.js
- `Barra de descanso, reloj de la tarjeta y pantalla bloqueada (2026-11-12)` --references--> `fmtClock()`  [INFERRED]
  docs/rutas/descanso-y-alarma.md → js/format.js
- `Cómo probar` --references--> `weekSummary()`  [INFERRED]
  docs/rutas/movilidad.md → js/stats.js
- `Pendientes técnicos conocidos` --references--> `refreshExercises()`  [INFERRED]
  docs/proyecto/progreso.md → js/ui/entrenar.js
- `Gestos táctiles en iOS (leer antes de tocar cualquier gesto)` --references--> `refreshExercises()`  [INFERRED]
  docs/rutas/gestos-y-reordenar.md → js/ui/entrenar.js

## Import Cycles
- None detected.

## Communities (29 total, 3 thin omitted)

### Community 0 - "main.js"
Cohesion: 0.11
Nodes (48): Dónde va cada cosa, Historial de cambios, Lecciones aprendidas, Actualizaciones automáticas (nunca hay que reinstalar la PWA), Archivos y funciones, Archivos y funciones, Qué es, Reglas (2026-09-13) (+40 more)

### Community 1 - "capturas-iphone.mjs"
Cohesion: 0.05
Nodes (41): Archivos y funciones, Cómo probar, graphify, Lecciones que aplican, Qué es, Ruta: ejercicios y taxonomía de músculos, Taxonomía de músculos (2026-08-12), Reglas (+33 more)

### Community 2 - "el"
Cohesion: 0.13
Nodes (47): 6. Reglas técnicas (resumen; detalle en `docs/convenciones.md`), Cómo probar, Archivos y funciones, Gráfica del ejercicio (2026-11-12), clear(), el(), normalizeKey(), autofillPlan() (+39 more)

### Community 3 - "Archivos y funciones"
Cohesion: 0.13
Nodes (35): Alarma de descanso (reescrita el 2026-09-13), Archivos y funciones, Barra de descanso, reloj de la tarjeta y pantalla bloqueada (2026-11-12), Cómo probar, graphify, Lecciones que aplican, Qué es, Reglas de producto (+27 more)

### Community 4 - "Reglas obligatorias"
Cohesion: 0.10
Nodes (20): Cómo traducir la HIG a una app web, D10. No confirmar lo que se puede deshacer, D11. El color nunca es la única señal, D12. Cada control propio tiene estado presionado y nombre para VoiceOver, D13. Márgenes seguros y barra de estado visible, D14. Textos: sentence case en español, verbos en los botones y errores que dicen cómo arreglar, D1. Área táctil de 44×44, o 28×28 si es una excepción anotada, D2. El texto sigue el tamaño elegido en el iPhone (Dynamic Type) (+12 more)

### Community 5 - "enableDragOrder"
Cohesion: 0.13
Nodes (22): Archivos y funciones, Cómo probar, Gestos táctiles en iOS (leer antes de tocar cualquier gesto), graphify, Lecciones que aplican, Qué es, Reordenar arrastrando (`js/ui/dragorder.js`), Ruta: reordenar arrastrando y gestos táctiles en iOS (+14 more)

### Community 6 - "Registro de decisiones"
Cohesion: 0.07
Nodes (26): 2026-07-28 · Descanso: 90 s por defecto, configurable por ejercicio o por sesión, 2026-07-28 · Nace gym-tracker, separado de habitos-app, 2026-07-28 · Solo sets `Done` cuentan para PR, volumen y gráficas, 2026-07-28 · Stack: HTML + CSS + JS vanilla con ES modules, sin dependencias, 2026-07-28 · Unidades: guardar en kg, mostrar en lbs, teclear en ambas, 2026-08-02 · Actualización automática, nunca reinstalar, 2026-08-12 · Autollenado desde la última sesión, NO plantillas, 2026-08-12 · Estética "Vidrio Negro" (reemplazada el 2026-09-26) (+18 more)

### Community 7 - "Ruta: arranque y actualizaciones automáticas"
Cohesion: 0.29
Nodes (7): Arranque (por qué index.html NO está vacío), Cómo probar, graphify, Lecciones que aplican, Qué es, Reglas, Ruta: arranque y actualizaciones automáticas

### Community 9 - "manifest.json"
Cohesion: 0.17
Nodes (11): background_color, description, display, icons, lang, name, orientation, scope (+3 more)

### Community 10 - "gym-tracker: reglas para agentes"
Cohesion: 0.20
Nodes (10): 0. Regla dorada: estandarizar (antes de escribir una línea), 1. Quién es el dueño y qué quiere, 2. Cómo comunicarte con Esteban, 3. Ahorro de tokens: lee solo lo necesario, 4. Flujo de trabajo estándar, 5. Merge automático: autorización permanente de Esteban, 7. graphify (mapa del código, ahorra tokens), 8. Comandos (+2 more)

### Community 11 - "Guía de vibe coding para gym-tracker"
Cohesion: 0.20
Nodes (10): 0. La idea en una frase, 1. Cómo pedir algo: cuatro partes, 2. Pasos pequeños y verificables, 3. La documentación que el agente mantiene, 4. Git sin tecnicismos: nunca perder trabajo, 5. Verificar sin saber programar, 6. Patrones de falla y cómo detectarlos, 7. Plantilla para pedir una función nueva (+2 more)

### Community 12 - "Pruebas en el iPhone"
Cohesion: 0.17
Nodes (12): Actualizaciones (nunca reinstalar), Ajustes y Apariencia (2026-10-02), Arranque, Buscador, récords, descanso y discos (pendiente, 2026-11-12), Descanso y alarma, Entrenar, Movilidad (pendiente, 2026-10-15), Pruebas en el iPhone (+4 more)

### Community 13 - "movilidad.js"
Cohesion: 0.16
Nodes (27): Archivos y funciones, Cómo probar, graphify, Lecciones que aplican, Qué es, Reglas, Ruta: movilidad (rutina guiada con animaciones), dayKey() (+19 more)

### Community 14 - "package.json"
Cohesion: 0.25
Nodes (7): description, name, private, scripts, check, test, type

### Community 15 - "Progreso"
Cohesion: 0.29
Nodes (6): Estado (2026-11-12), Ideas anotadas (sin compromiso; requieren OK de Esteban), Lo que sigue, Pendiente de probar en el iPhone (Esteban), Pendientes técnicos conocidos, Progreso

### Community 16 - "entrenar.js"
Cohesion: 0.11
Nodes (72): Reglas de código, 2026-10-04 · El autollenado propone ejercicios, no sets, Archivos y funciones, Las tarjetas de ejercicio NO se abren solas (2026-09-13), dbGetAll(), dbGetAllBy(), guard(), toast() (+64 more)

### Community 17 - "Ruta: datos, IndexedDB y respaldos"
Cohesion: 0.29
Nodes (7): Cómo probar, Esquema IndexedDB (`gymtracker-db` v1), graphify, Lecciones que aplican, Reglas, Riesgo abierto, Ruta: datos, IndexedDB y respaldos

### Community 18 - "Índice: por dónde empezar según la tarea"
Cohesion: 0.33
Nodes (6): Antes de escribir código, Documentos para Esteban (lenguaje sencillo), Mantener este índice, Memoria del proyecto, Referencias viejas "README §N", Índice: por dónde empezar según la tarea

### Community 19 - "modals.js"
Cohesion: 0.11
Nodes (27): Agregar ejercicio, récords y discos (2026-11-12), graphify, Lecciones que aplican, Modelo de sets: propuesto vs registrado (leer antes de tocar `entrenar.js`), Qué es, Render quirúrgico (regla de UI), Ruta: entrenar (sesión activa, sets, autollenado), Archivos y funciones (+19 more)

### Community 20 - "Convenciones: una sola forma de hacer cada cosa"
Cohesion: 0.33
Nodes (5): Commits y ramas, Convenciones: una sola forma de hacer cada cosa, Instrucciones para Esteban, Mapa de archivos, Verificar (no negociable)

### Community 21 - "Ruta: progresión, estadísticas y cálculos"
Cohesion: 0.29
Nodes (6): Cómo probar, graphify, Lecciones que aplican, Qué es, Reglas, Ruta: progresión, estadísticas y cálculos

### Community 22 - "Ruta: publicar y verificar"
Cohesion: 0.33
Nodes (6): Cómo se publica hoy, Lecciones que aplican, Pasos de cada entrega, Ruta: publicar y verificar, Verificar en el iPhone (lo hace Esteban), Verificar en navegador

### Community 23 - "Cómo trabajar en este proyecto (vibe coding, lo esencial)"
Cohesion: 0.20
Nodes (6): 1. Cada pedido tiene cuatro partes, 2. Rutina de cada sesión, 3. Señales de alarma, Cómo trabajar en este proyecto (vibe coding, lo esencial), Estado, Gym Tracker

### Community 25 - "Ruta: interfaz y diseño"
Cohesion: 0.25
Nodes (8): Archivos, Cómo probar, graphify, Lecciones que aplican, Pendiente de confirmar en el iPhone, Qué es, Ruta: interfaz y diseño, Tokens (usa estos nombres; no hay otros)

### Community 27 - "Cómo funcionan las apps de gimnasio"
Cohesion: 0.33
Nodes (5): Algoritmos de progresión publicados, Cómo funcionan las apps de gimnasio, Investigación 2026-11: apps de gimnasio y widgets en iOS, Qué evitar (quejas de usuarios), Widgets y Live Activities en iOS (iPhone 11, iOS 26.7)

### Community 28 - "Movilidad: fuentes, evidencia y cómo mejorar la rutina"
Cohesion: 0.25
Nodes (8): 1. Proceso estándar para cambiar la rutina, 2. Evidencia (qué sabemos y qué no), 3. Dónde conseguir animaciones (de mejor a peor), 4. Sacar el contenido de un video sin verlo, 5. Ideas para después (sin compromiso), 6. Registro de cambios de la rutina, Movilidad: fuentes, evidencia y cómo mejorar la rutina, Receta para convertir (ffmpeg, ya instalado en la nube)

## Knowledge Gaps
- **1 isolated node(s):** `npx`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 209 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Registro de decisiones` connect `Registro de decisiones` to `entrenar.js`?**
  _High betweenness centrality (0.084) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `el()` (e.g. with `6. Reglas técnicas (resumen; detalle en `docs/convenciones.md`)` and `Dónde va cada cosa`) actually correct?**
  _`el()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `npx` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `main.js` be split into smaller, more focused modules?**
  _Cohesion score 0.1081277213352685 - nodes in this community are weakly interconnected._
- **Why does `el()` connect `el` to `main.js`, `Archivos y funciones`, `movilidad.js`, `entrenar.js`, `modals.js`?**
  _High betweenness centrality (0.079) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `guard()` (e.g. with `6. Reglas técnicas (resumen; detalle en `docs/convenciones.md`)` and `Dónde va cada cosa`) actually correct?**
  _`guard()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `capturas-iphone.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.053551912568306013 - nodes in this community are weakly interconnected._