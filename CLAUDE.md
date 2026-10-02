# gym-tracker: reglas para agentes

Este archivo se carga en cada sesión: está escrito para ser corto. Lo específico de cada tarea está en `docs/00-INDICE.md`. Aplica a cualquier agente (Claude, Codex, Gemini u otro).

## 0. Regla dorada: estandarizar (antes de escribir una línea)

El proyecto tiene **una estructura fija y una sola forma de hacer cada cosa**, para que no se degrade con el tiempo ni con la llegada de modelos distintos que harían las cosas a su manera.

1. **Copia el patrón existente.** Antes de crear algo, búscalo en `docs/convenciones.md` y en el código parecido. No introduzcas una segunda forma de resolver algo ya resuelto (otra manera de crear DOM, de leer IndexedDB, de animar, de nombrar).
2. **Si no hay patrón, créalo una vez y documéntalo** en `docs/convenciones.md` (y el porqué en `docs/proyecto/decisiones.md`).
3. **Si un patrón te parece malo, cámbialo en todo el proyecto o no lo cambies.** Nada de excepciones sueltas.
4. **Deja todo mejor ordenado de como lo encontraste**: si una ruta de `docs/rutas/` o un documento quedó desactualizado por tu cambio, corrígelo en el mismo commit. La degradación de la documentación es el modo de falla número uno de un proyecto operado por agentes.

## 1. Quién es el dueño y qué quiere

- **Esteban**: estudiante de derecho en Colombia. **No sabe programar.** Dirige el proyecto; tú haces todo lo técnico.
- **La app**: PWA personal para registrar su entrenamiento en el gimnasio, instalada en su **iPhone 11**. Un solo usuario. Publicada en GitHub Pages desde `main`: https://tebanduarte2006.github.io/gym-tracker/
- **Se usa entre series**, con prisa, el pulgar sudado y a veces sin señal. Un peso mal leído o un toque accidental es el fallo más caro que puede tener.
- **Principios que no se negocian**:
  - Solo gimnasio. Hábitos y salud mental, fuera para siempre.
  - Cero costos y cero dependencias externas.
  - **Nunca hay que borrar y reinstalar la app**: se actualiza sola. Hoy los datos viven en el teléfono, así que borrarla borra su historial. No le pidas eso jamás.
  - Sin plantillas como entidad: la sesión anterior es el molde de la próxima.
- Estado actual y lo que sigue: `docs/proyecto/progreso.md`.

## 2. Cómo comunicarte con Esteban

1. **No narres el proceso.** Prohibido "Ahora leo X…", "Voy a revisar…". Trabaja en silencio.
2. **Mientras trabajas, solo puedes escribir dos cosas**: una alerta real ("Encontré un error grave: …") o una pregunta que de verdad necesitas para seguir (usa la herramienta de preguntas con opciones).
3. **Al terminar, un solo mensaje** con:
   - **Qué cambió**, en 1 a 3 frases sin jerga.
   - **Qué tienes que hacer tú**, en pasos numerados y exactos: dónde tocar y qué debe aparecer en pantalla. Si no tiene que hacer nada, dilo.
   - **Qué no pude comprobar**, si hay algo (todo lo que solo confirma el iPhone real va aquí).
4. **Lenguaje de abogado, no de programador.** Cada término técnico se explica la primera vez con una analogía ("rama = borrador paralelo del expediente").
5. **Su iPhone está en inglés.** Nombres de iOS en inglés y en negrilla, tal como aparecen (**Settings**, **Share** → **Add to Home Screen**). Los textos de la app, en español (**Ajustes** → **DATOS**).
6. **Español de Colombia, sin voseo.** Sé directo: si una idea suya es mala o imposible, díselo con la razón.

## 3. Ahorro de tokens: lee solo lo necesario

1. **No leas todo el código ni todos los documentos.** Empieza en `docs/00-INDICE.md`, busca tu tipo de tarea y lee **solo** esa ruta de `docs/rutas/`.
2. **Antes de abrir archivos, usa graphify** (§7). Abre solo los archivos y líneas que el grafo o la ruta señalen. `js/ui/entrenar.js` tiene 1.550 líneas: nunca lo leas entero. Para texto puntual, `grep`.
3. Las lecciones (`docs/proyecto/lecciones.md`) se leen **por número**, solo las que cita tu ruta.
4. **Delega en subagentes** las búsquedas amplias o investigaciones en la web, y pídeles un resumen corto.

## 4. Flujo de trabajo estándar

1. Lee `docs/00-INDICE.md` → la ruta de tu tarea → `docs/convenciones.md` (si vas a escribir código) → `docs/proyecto/progreso.md` ("Lo que sigue").
2. Si el pedido es ambiguo o falta un dato que solo Esteban tiene, pregunta **antes** de programar. Si hay un estándar razonable, decide tú y menciónalo al final.
3. Trabaja en tu rama asignada. Si esa rama ya se fusionó antes, reiníciala desde `main` actualizado.
4. **Verifica antes de dar algo por terminado**:
   - `npm test` y `npm run check` (sintaxis de todo el JS).
   - Cambios de interfaz: `node scripts/capturas-iphone.mjs` y mira las capturas, en claro y oscuro.
   - **Nada táctil se da por bueno probándolo con el ratón**: eventos táctiles reales (`docs/rutas/gestos-y-reordenar.md`).
5. Publica: `CACHE` en `sw.js` y `APP_VERSION` en `js/swupdate.js` con el mismo valor `YYYYMMDD-N`; archivo nuevo → `ASSETS` (`docs/rutas/publicar-y-verificar.md`).
6. Actualiza la documentación afectada, en el mismo commit: la ruta que tocaste, una fila en `docs/proyecto/historial.md`, `progreso.md`, `decisiones.md` si decidiste algo, `docs/esteban/pruebas-iphone.md` con la lista de chequeo de lo nuevo.
7. Si cambiaste código: `graphify update .` e incluye `graphify-out/` en el commit.
8. **Merge automático** (§5). GitHub Pages publica `main` en 1 a 2 minutos.
9. Escribe el mensaje final (§2.3).

## 5. Merge automático: autorización permanente de Esteban

Esteban autorizó (2026-09-26) que **cada agente una su rama a `main` sin preguntar** cuando las verificaciones del §4.4 pasan y el CI está en verde.

- **Cómo**: crea el Pull Request y fusiónalo tú mismo con las herramientas de GitHub (`merge_pull_request`).
- **Excepciones: aquí sí preguntas antes de fusionar**, explicando el riesgo en palabras simples:
  - Cambios que borran o transforman datos que ya existen (migraciones de esquema, migraciones de su historial, cambios en `js/importer.js` o `js/db.js` que puedan perder algo al restaurar).
  - Cambios en el formato del export (lo consume el registro mensual del vault de Obsidian).
  - Cualquier cosa que cueste dinero, agregue un servicio externo o una dependencia.
  - Quitar funciones que él usa.
  - Si las pruebas fallan y no sabes por qué.
- **Nunca**, ni con permiso implícito: `git push --force` a `main`, `--amend` sobre commits publicados, `--no-verify`, `git reset --hard` o `git clean` sobre trabajo sin guardar, borrar ramas ajenas.

## 6. Reglas técnicas (resumen; detalle en `docs/convenciones.md`)

- **Stack congelado**: HTML + CSS + JS vanilla con ES modules. Sin npm (el `package.json` es solo para `node --test`), sin frameworks, sin bundlers, sin CDN, sin fuentes remotas.
- **Sin `innerHTML`**: todo DOM por `el()` de `js/dom.js`. Toda promesa de IndexedDB que alimente la interfaz pasa por `guard()`.
- **Solo sets `Done` cuentan** para PR, 1RM, volumen y gráficas (`isCountable`). Peso 0 con reps es válido.
- **Peso canónico SIEMPRE en kg** en la base; se muestra en lbs.
- **Cálculos en módulos puros** (`format.js`, `stats.js`, `plates.js`, `muscles.js`, `importer.js`) con pruebas.
- **Render quirúrgico**: una acción puntual actualiza solo su tarjeta.
- **Toda preferencia nueva** va a `PREFS_IMPORTABLES`.
- **Diseño**: tema crema con acentos naranjas (claro) y Everforest (oscuro), superficies sólidas, letra Atkinson Hyperlegible Next, colores solo por variables de `styles.css`. **Reglas de Apple obligatorias para cualquier cambio de interfaz: `docs/diseno-ios.md`** (áreas de 44, texto que sigue al iPhone, contraste; mismo archivo que en Plata; para dudas, la skill `apple-design-skill`). Prohibido el estilo genérico "hecho con IA": degradados morados, emojis decorativos en títulos, sombras exageradas. Detalle en `docs/rutas/interfaz-y-diseno.md`.
- **Alcance**: no agregues funciones ni refactors que no se pidieron. Un propósito por commit. Las ideas van a `docs/proyecto/progreso.md`.

## 7. graphify (mapa del código, ahorra tokens)

El proyecto tiene un grafo en `graphify-out/`: funciones, archivos y cómo se conectan.

- **Preguntar**:
  - `graphify explain "<nombreDeFunción>"`: quién la llama, a quién llama y en qué línea está. Es lo más preciso.
  - `graphify path "<A>" "<B>"`: cómo se conectan dos funciones.
  - `graphify query "<palabras>"` busca por nombres, no entiende frases: usa los nombres del código (`"refreshExercises autofillPlan"`), no preguntas en español.
  - Cada ruta de `docs/rutas/` termina con los `graphify explain` útiles para su tema.
- **Actualizar** después de cambiar código: `graphify update .` (gratis, sin IA), antes del commit.
- `graphify-out/GRAPH_REPORT.md` es solo para revisiones de arquitectura completas. No lo leas por rutina.
- En sesiones en la nube, graphify se instala solo al arrancar (`.claude/settings.json`). Si no está: `pip install graphifyy`.

## 8. Comandos

```bash
npm test                          # pruebas (node --test)
npm run check                     # sintaxis de todo el JS
node scripts/capturas-iphone.mjs  # capturas iPhone 11 en claro y oscuro (sirve el repo solo)
graphify update .                 # actualizar el mapa del código
python3 -m http.server 8000       # servir la app a mano
```

## graphify

Esta sección la agrega graphify y sus hooks la buscan por el título: no borrar. El detalle está en la sección 7.
