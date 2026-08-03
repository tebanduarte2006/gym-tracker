# Gym Tracker — Documento maestro para agentes

> **LECTURA OBLIGATORIA COMPLETA antes de tocar una sola línea de código.**
> Este README es la fuente única de verdad del proyecto: reglas de operación,
> arquitectura, schema, workflow de deploy, lecciones aprendidas y pendientes.
> `CLAUDE.md` (auto-cargado por Claude Code) es solo un puntero a este archivo.
> Cualquier agente (Claude, Codex, Gemini, opencode u otro) opera bajo estas
> reglas. Si algo de este README queda obsoleto por un cambio tuyo,
> **actualízalo en el mismo commit** — la degradación documental es el modo de
> falla #1 de los proyectos operados por agentes.

---

## 1. Qué es esto

PWA personal de **Esteban Duarte** (esteban.duarte.h@gmail.com) para trackear
su progreso en el gimnasio. Un solo usuario, un solo módulo. Corre instalada
en su **iPhone 11** desde GitHub Pages.

- **Producción:** https://tebanduarte2006.github.io/gym-tracker/
- **Repo:** https://github.com/tebanduarte2006/gym-tracker (público)
- **Repo local (Mac):** `~/gym-tracker` · rama `main` · deploy automático de Pages desde `main`.
- **Antecesor:** [habitos-app](https://github.com/tebanduarte2006/habitos-app) — sigue
  viva y congelada; NO se toca. Gym Tracker nació de una revisión maestra de
  ese repo (2026-07-28) que detectó ~17 bugs/deudas, todos corregidos aquí.
- Esteban es **estudiante de derecho, principiante en Git/GitHub**: explica los
  pasos de deploy/verificación con detalle en cada entrega.

## 2. Reglas de operación (no negociables)

1. **Leer este README completo antes de editar.** No improvisar sobre lo documentado.
2. **Stack congelado:** HTML + CSS + JS vanilla con **ES modules**. Sin npm
   (el `package.json` existe solo para `node --test` y `"type": "module"`),
   sin frameworks, sin bundlers, sin CDN, sin fuentes web, sin `<script src>` remoto.
3. **Sin `innerHTML` para contenido.** Todo DOM via `el()` de `js/dom.js`
   (no tiene backdoor de HTML, a propósito).
4. **Toda promesa de IndexedDB que alimente UI pasa por `guard()`** de
   `js/dom.js` (error visible en toast, nunca pantalla en blanco).
5. **Solo sets `Done` cuentan** para PR, 1RM, volumen y gráficas (`js/stats.js`).
   Peso 0 con reps > 0 es válido (peso corporal). No "arreglar" esto filtrando
   por peso > 0.
6. **Los cálculos viven en módulos puros** (`format.js`, `stats.js`,
   `importer.js`): sin DOM ni IndexedDB, para que sean testeables en Node.
   Lógica nueva de cálculo → módulo puro + test.
7. **Antes de CADA commit:** `npm test` (26+ tests) y `npm run check`
   (sintaxis de todo el JS). Ambos deben pasar. El CI de GitHub Actions los
   repite en cada push — un push rojo se corrige de inmediato.
8. **Bumpear `CACHE` en `sw.js` Y `APP_VERSION` en `js/swupdate.js`** con el
   MISMO valor en cada deploy (`YYYYMMDD-N`). Archivo nuevo → agregarlo a
   `ASSETS`. Olvidar `CACHE` = la PWA sirve código viejo; olvidar `APP_VERSION`
   = la pantalla de versión miente y marca ⚠️ sin motivo.
9. **Registrar todo cambio en §9 (Historial)** en el mismo commit.
10. **Commit + push al terminar cada tarea.** Sin `--amend`, `--force-push`
    ni `--no-verify` salvo instrucción explícita de Esteban.
11. **Cross-platform:** nada de rutas absolutas de un equipo ni comandos
    exclusivos de macOS en scripts del repo.
12. **Peso canónico SIEMPRE en kg** en la DB. Display siempre en lbs. La
    unidad es un asunto de input/display, jamás de almacenamiento.
13. **No refactorizar de paso.** Cambios quirúrgicos, un propósito por commit.

## 3. Arquitectura

```
index.html            Shell ESTÁTICO (título + tabs + esqueleto) + <script type="module">.
styles.css            Design tokens Apple dark + clases g-*. Fuente: rediseño V3 de habitos-app, depurado.
manifest.json         PWA (es-CO, standalone, iconos 192/512/maskable).
sw.js                 Service worker: cache-first versionado; responde 'VERSION' y 'SKIP_WAITING'.
js/
  main.js             Bootstrap: tabs, oferta de seed.
  swupdate.js         Registro del SW, detección/aplicación de versiones, APP_VERSION.
  db.js               IndexedDB: UNA conexión cacheada, índices usados de verdad, bulk import transaccional.
  dom.js              el() / clear() / toast() / guard().
  format.js           [PURO] unidades kg↔lbs, fechas es-CO, duraciones, normalización.
  stats.js            [PURO] isCountable/isPlaceholder, PR peso/reps, Epley, volumen, filas por sesión.
  importer.js         [PURO] normaliza backups v2 (habitos-app, con toda su deuda) y v3 (nativo).
  audio.js            Beep Web Audio (iOS no soporta navigator.vibrate).
  wakelock.js         Screen Wake Lock durante sesión activa.
  resttimer.js        Rest timer por TIMESTAMP (endTs fijo), sobrevive lock/background.
  ui/entrenar.js      Tab 1: sesión activa, sets quirúrgicos, cardio, reordenar, copiar última sesión.
  ui/ejercicios.js    Tab 2: directorio, crear/editar, muscle picker.
  ui/progresion.js    Tab 3: hero semanal, PR doble, chart SVG, cardio, export/import.
  ui/modals.js        Bottom sheets, confirmaciones, autocomplete.
  ui/icons.js         Iconos SVG inline.
tests/                node --test. format/stats/importer + validación del seed real.
scripts/check-syntax.mjs   npm run check.
data/seed.json        Backup real de habitos-app (2026-07-28). Primera apertura con DB vacía lo ofrece restaurar.
icons/                Generados desde la imagen elegida por Esteban. NO regenerar sin que él lo pida.
```

### Arranque (por qué index.html NO está vacío)

El arranque en frío de la PWA en iOS era **una pantalla negra de varios
segundos**. Tres causas, las tres corregidas el 2026-08-02; si tocas alguna de
estas piezas, entiende primero por qué están:

1. **Sin splash.** Sin etiquetas `apple-touch-startup-image`, iOS pinta el
   `background_color` del manifest (negro) mientras arranca. Ahora hay 5
   splashes (`icons/splash-*.png`, ícono redondeado sobre negro) cubriendo los
   iPhone con notch, incluido el 11 de Esteban (828×1792). Regenerarlos desde
   `icons/icon-512.png` si cambia el ícono.
2. **`index.html` no pintaba nada** hasta que los 12 módulos ES se descargaban,
   se ejecutaban y volvía el primer viaje a IndexedDB. Ahora el título, la barra
   de tabs y un esqueleto viven **estáticos en el HTML**; `js/main.js` se
   engancha a esos nodos (`#tab-btn-*`, `#tab-content`) en vez de crearlos.
   **No devuelvas eso a JS "por limpieza".** Si cambias los ids o las etiquetas,
   cambia `TABS` en `js/main.js` a la vez.
3. **Recarga espuria:** `controllerchange` recargaba la página también en la
   primerísima instalación (cuando `clients.claim()` toma control por primera
   vez), duplicando el arranque. Ahora solo recarga si ya había un controller.

### Actualizaciones automáticas (nunca hay que reinstalar la PWA)

Requisito duro de Esteban: **ningún cambio debe exigir desinstalar y reinstalar**.
Todo vive en `js/swupdate.js` (aparte de `main.js` porque Progresión necesita
`swVersion()`/`forceUpdateCheck()` y `main.js` ya importa Progresión: juntarlos
sería un import circular). Seis piezas, y hacen falta las seis:

1. `register(..., { updateViaCache: 'none' })` — el navegador no puede servir un
   `sw.js` viejo desde su caché HTTP (GitHub Pages manda `max-age=600`).
2. **Mirar los TRES estados** (`reg.waiting`, `reg.installing`, `updatefound`).
   Cuando `register()` resuelve, el navegador puede haber encontrado e instalado
   ya la versión nueva: `updatefound` **ya se disparó** y engancharlo entonces no
   sirve de nada. Enganchar solo `updatefound` deja la actualización invisible
   para siempre. Fue el bug que dejó a Esteban sin banner el 2026-08-02.
3. **Auto-activación si no está entrenando.** Depender de que vea y toque un
   banner es frágil. Si hay una sesión de gym a medias sí se pregunta (recargar
   en mitad de una serie es peor que esperar); si no, se aplica sola.
4. `reg.update()` al abrir y al volver del background (throttle 60 s) → una PWA
   que queda abierta días detecta la versión nueva sin reiniciarse.
5. Recarga por `controllerchange` **solo si ya había controller** (ver arriba).
6. **Versión visible + botón manual** en Progresión → DATOS. `APP_VERSION`
   (lo que este JS cree ser) contra la constante `CACHE` que el service worker
   responde por `postMessage('VERSION')` (lo que se sirve de verdad). Si
   divergen, sale ⚠️. **Sin esto era imposible diagnosticar "no se actualizó"**:
   la ausencia de banner porque ya estás al día se ve idéntica a estar trabado
   en la versión vieja. Al bumpear `CACHE` en `sw.js`, bumpea `APP_VERSION` en
   `js/swupdate.js` con el mismo valor.

**Trampa de arranque (leer antes de tocar esto):** el código que decide si te
avisa de una actualización es el que YA está cacheado en el teléfono. Un arreglo
al mecanismo de actualización no se aplica a sí mismo — solo protege de la
siguiente vez en adelante. Por eso importan el botón manual y la versión visible:
son la salida de emergencia cuando el automatismo falla.

Además `sw.js` cachea el shell (`CORE`) de forma atómica y el resto uno por uno:
antes, UN solo 404 en `ASSETS` tumbaba la instalación entera y la PWA se quedaba
clavada en la versión vieja sin avisar.

Verificado end-to-end en navegador el 2026-08-02, los cuatro caminos: (a) bump
de `CACHE` → banner sin recargar; (b) recarga sin aceptar → el banner vuelve;
(c) sin sesión activa → se actualiza sola, sin banner, caché vieja borrada;
(d) con sesión de gym a medias → NO recarga, muestra el banner. Datos intactos
en los cuatro.

### Render quirúrgico (regla de UI)

En sesión activa, agregar un set / cambiar un status actualiza **solo la card
afectada** (`updateSets()` interno de cada card). Jamás re-renderizar la lista
completa por una acción puntual: colapsa cards y cierra el teclado en pleno
entrenamiento (bug #1 de la app vieja).

## 4. Schema IndexedDB (`gymtracker-db` v1)

```
sesiones   { id (AI), nombre, fecha (ISO), timestamp_inicio, duracion_ms?,
             finalizada (bool), routine_type?, ej_orden? [ejercicio_id] }
ejercicios { id (AI), nombre (índice unique), musculos [array nativo],
             tipo? (free-text: última rutina en que se usó), rest_sec?,
             fecha_creacion? }
             · rest_sec: descanso default del ejercicio; null → pref rest_default (90s)
sets       { id (AI), sesion_id (índice), ejercicio_id (índice),
             peso (kg SIEMPRE), reps, orden?, status, unidad? ('lbs'|'kg'), ts? }
             · status: Pending | Done | Skipped
             · placeholder técnico = Pending + peso 0 + reps 0 (ancla ejercicio↔sesión;
               se eliminan TODOS los Pending al finalizar la sesión)
             · unidad: lo que Esteban tecleó (para recordar por-ejercicio su última unidad)
cardio     { id (AI), sesion_id (índice), tipo (free-text), duracion_min,
             velocidad_kmh?, inclinacion?, orden?, ts? }
preferencias { clave, valor }
             · rest_default (90) · contador_workouts · seed_decidido
```

**Cambios de schema:** subir `DB_VERSION`, migrar en `onupgradeneeded`,
actualizar `importer.js` + tests + esta sección, en el mismo commit.

## 5. Decisiones de producto (confirmadas por Esteban 2026-07-28)

- **Sin plantillas de rutina.** Lo evaluó y lo rechazó: prefiere armar cada
  sesión ejercicio por ejercicio. No reintroducir.
- **Display lbs, input lbs/kg** por set (su gym mezcla equipos). El toggle
  recuerda la última unidad usada por ejercicio.
- **Rest timer:** default 90s → configurable por ejercicio (persistente) o
  solo-esta-sesión (en memoria), desde la sesión activa **o** desde el detalle
  del ejercicio (que también ajusta el `rest_default` global). Beep Web Audio +
  Wake Lock. **Widgets de home screen y Live Activities de lock screen:
  imposibles en una PWA de iOS** (requieren app nativa con WidgetKit/ActivityKit)
  — no prometérselo.
- **Alerta de fin de descanso — límite honesto:** con la app en background o la
  pantalla bloqueada, iOS congela los timers de JS y suspende el AudioContext.
  El *conteo* sí sobrevive (va por timestamp fijo), la *alerta* no está
  garantizada. Mitigación: el beep se **programa por adelantado** en el reloj
  del AudioContext (`audio.js` › `scheduleBeep`), que suena aunque el JS esté
  congelado *si* iOS no suspendió el contexto; si lo suspendió,
  `scheduleWasLost()` hace que suene al volver, sin duplicar. La defensa real
  es el Wake Lock: durante la sesión la pantalla no se apaga sola.
  **No escribas en el README ni en la UI que el aviso suena con la pantalla
  bloqueada.**
- **Cardio:** tipo free-text + duración min + velocidad/inclinación opcionales.
- **Estética:** Apple dark + acento naranja `#FF9F0A`, heredada. No cambiarla.
- **Ícono:** su imagen de mancuerna cartoon, sin distorsión. Fondo blanco.
- **Mental/hábitos:** fuera del alcance para siempre. Esto es SOLO gym.
- **Registro en el vault:** export mensual → un agente lo vuelca a
  `20 Areas/Salud/Gym/` del vault Ideaverse según
  `90 Sistema/Formato Registro Gym.md`. Ver ese doc antes de tocar el formato.

## 6. Deploy (paso a paso)

```bash
cd ~/gym-tracker
npm test && npm run check        # 1. ambos verdes o no hay commit
# 2. bumpear CACHE en sw.js (gymtracker-YYYYMMDD-N); archivos nuevos → ASSETS
# 3. actualizar §9 Historial (fila nueva con (pending))
git add -A && git commit -m "feat|fix|docs(scope): descripción"
git push origin main             # Pages redespliega en 1-2 min
git log -1 --format=%h           # 4. reemplazar (pending) por el SHA
git add README.md && git commit -m "docs: registra sha en changelog" && git push
```

**Verificación en iPhone:** cerrar la PWA del multitarea y reabrirla; si el
banner "Nueva versión disponible" aparece, tocar Actualizar.

## 7. Lecciones aprendidas (de habitos-app y de este build)

1. **iOS Safari NO tiene `navigator.vibrate`.** La app vieja "avisaba" el fin
   del descanso con una vibración que jamás sonó. Alertas → Web Audio.
2. **`setInterval` decrementando un contador miente en iOS** (se congela en
   background/lock). Todo conteo → contra timestamp fijo.
3. **Un filtro `!== Pending` no es `=== Done`.** Los Skipped contaminaron PRs
   de la app vieja durante meses.
4. **`Number(null) === 0`:** un campo ausente puede volverse "0 lbs" real.
   Chequear null antes de convertir (test `fmtWeight muestra —`).
5. **Los esquemas viejos nunca mueren:** 167 sets (29% de la historia) tenían
   solo `peso_lbs` porque un cambio de schema de abril nunca migró lo previo.
   El importador los rescata; jamás asumir que la data histórica es uniforme.
6. **Re-renderizar todo por un tap** colapsa UI con estado (cards, teclado).
   Render quirúrgico por card.
7. **"Se descartarán" debe ser verdad:** la app vieja avisaba que descartaba
   pendientes y los dejaba en la DB para siempre.
8. **Contadores derivados de `count+1` se repiten al borrar.** Consecutivos →
   contador persistente en preferencias.
9. **Archivos muertos y nombres con `:` o espacio inicial** rompen checkouts
   en Windows y confunden a los agentes. `.gitignore` desde el día 0 y cero
   archivos huérfanos.
10. **IndexedDB no indexa booleanos** (la app vieja tenía un índice sobre
    `finalizada` que nunca pudo funcionar).
11. **Un test que dice "conserva todo" y no lo comprueba es peor que no
    tenerlo.** `v3 roundtrip` pasaba en verde mientras el importador tiraba a la
    basura `preferencias` y `ts` en cada restauración. Si el nombre de un test
    hace una promesa, las aserciones tienen que cubrirla entera.
12. **Una conexión IndexedDB cacheada puede morir.** iOS la cierra por presión
    de memoria o suspensión larga; sin `db.onclose` que suelte la caché, toda
    operación posterior lanza `InvalidStateError` y la app queda inservible
    hasta reabrirla. `db.js` › `withDB()` reabre y reintenta una vez.
13. **Un fallo pintando un tab no puede tumbar el arranque.** Una excepción en
    `boot()` abortaba el `forEach` y dejaba la app sin service worker (adiós
    actualizaciones) y sin la oferta de restaurar el historial. Ahora cada tab
    se pinta dentro de su propio try/catch.
14. **El mismo dato calculado en dos pantallas con filtros distintos siempre
    diverge.** El PR del directorio incluía sesiones sin finalizar; el detalle y
    Progresión no. Un solo criterio, o discrepan y no sabes cuál creer.
15. **Un elemento que hay que mirar no puede ir en el flujo normal.** La barra
    de descanso vivía arriba del todo: bajabas al 2º ejercicio y desaparecía,
    justo cuando la estás mirando. Ahora es `position: sticky`.

## 8. Pendientes / ideas evaluables

- [ ] Preferencia para display en kg (hoy display fijo lbs; pedirá OK Esteban).
- [ ] Gráfica de volumen por sesión además de peso máx.
- [ ] Recordatorio de export mensual (toast si el último export > 30 días).
- [ ] Editar sets de sesiones finalizadas (en la sesión ACTIVA ya se puede:
      tocar los valores del set abre el modal de corrección).
- [ ] Progresión de cardio (tiempo/velocidad en el tiempo) si Esteban acumula data.
- [ ] **Lo tecleado se pierde al reordenar/agregar ejercicio.** `refreshExercises()`
      reconstruye la lista entera, así que un peso a medio escribir en otra card
      se borra. Detectado 2026-08-02; no corregido (exige reescribir el render de
      la lista y la regla es "cambios quirúrgicos, cero refactors de paso").
- [ ] Sin historial del navegador: el gesto "atrás" del iPhone sale de la app en
      vez de volver de un detalle. Requeriría la History API.

## 9. Historial de cambios estructurales

> Una fila por commit o grupo relacionado. `(pending)` → SHA tras el push.
> Mencionar siempre `sw.js → gymtracker-YYYYMMDD-N` si hubo deploy.

| Fecha | Commits | Cambio |
|-------|---------|--------|
| 2026-08-02 | `bd45cc5` | **Actualizaciones: el banner nunca salió en el iPhone.** Esteban abrió la PWA tras el deploy anterior y no vio el aviso ni cerrándola del multitarea varias veces. Causa: `registerSW()` solo enganchaba `updatefound`, pero cuando `register()` resuelve el navegador **ya puede haber instalado** la versión nueva — el evento ya se disparó y el worker se queda en `waiting` invisible para siempre. Ahora se miran los tres estados (`waiting`, `installing`, `updatefound`). Además: **auto-activación** si no hay sesión de gym a medias (no depender de que vea un banner; entrenando sí pregunta), **versión visible** en Progresión → DATOS contrastando `APP_VERSION` con la constante `CACHE` que el SW responde por `postMessage`, y botón **"Buscar actualización"** manual como salida de emergencia. Lógica movida a `js/swupdate.js` (evita el import circular con Progresión). Verificado en Chrome los 4 caminos: banner sin recargar, banner que vuelve tras recargar, auto-actualización silenciosa sin sesión activa, y banner (sin recarga) con sesión a medias. 30/30 tests. `sw.js → gymtracker-20260802-2`. |
| 2026-08-02 | `ad9d827` | **Revisión maestra #2: 20 defectos corregidos.** Auditoría línea por línea de los 22 archivos. **Datos:** el backup v3 perdía `preferencias` (descanso global, contador de workouts) y `ts` de sets/cardio en cada restauración — el test "conserva todo" no los verificaba; ahora sí (30 tests). `dbBulkImport` acepta `preferencias` con lista blanca de claves. **Robustez:** `db.onclose` + `withDB()` reabren la conexión IndexedDB si iOS la mata (antes la app quedaba inservible hasta reabrirla); `boot()` aísla el render de cada tab; `sw.js` ya no aborta la instalación entera por un 404. **Actualizaciones (requisito de Esteban):** `updateViaCache:'none'`, banner desde `reg.waiting` al arrancar (antes una actualización ignorada se perdía para siempre), `reg.update()` al abrir y al volver del background, y fin de la recarga espuria del primer arranque. **Arranque:** 5 splashes `apple-touch-startup-image` + shell estático en `index.html` (ver §Arranque). **UX:** barra de descanso `sticky`; edición de sets ya guardados (peso/reps/unidad); descanso por ejercicio y `rest_default` global editables desde el tab Ejercicios; renombrar/cambiar rutina de un ejercicio; scroll del fondo bloqueado con el sheet abierto; `once()` contra el doble toque (dos sesiones de un tirón). **Correcciones:** PR del directorio contaba sesiones sin finalizar; cronómetro seguía latiendo al cambiar de tab; Wake Locks huérfanos; carrera en `orden` de sets; `fmtDate*` corría un día con fechas sin hora; mensaje de error engañoso al crear ejercicio; buscador de Ejercicios con debounce y una sola carga (antes 2 `dbGetAll` por tecla); Progresión indexa sets por ejercicio. Verificado en Chrome: restauración del seed, sesión completa, edición de set, descanso 150s, finalización, Progresión, export/import y el ciclo de actualización end-to-end. 0 errores de consola. 30/30 tests. `sw.js → gymtracker-20260802-1`. |
| 2026-07-29 | `5b8b9c1` | **Fix contador + smoke test integral.** `nextWorkoutNumber()` en `stats.js` (+ test): el número de workout ahora toma el máximo entre el contador persistente y el mayor "Workout #N" del historial — tras importar el seed, la primera sesión nueva salía "Workout #1" duplicando nombres históricos; ahora sale #36. Verificado en navegador real (Chrome, servidor local): restauración del seed, los 3 tabs, sesión completa (ejercicio, copiar última sesión, chips, rest timer, finalizar con limpieza de pendientes), cardio, config de descanso por ejercicio, modal de reanudación, eliminación cascade, y el banner de actualización del SW end-to-end. 0 errores de consola. 27/27 tests. `sw.js → gymtracker-20260729-1`. |
| 2026-07-28 | `a6e85ac` | **Génesis.** App completa creada desde cero tras revisión maestra de habitos-app (35 sesiones/578 sets migrados vía `data/seed.json`). Arquitectura ES modules, 26 tests Node, importador v2/v3 (rescata 167 sets legacy `peso_lbs`), rest timer por timestamp + beep Web Audio + Wake Lock, render quirúrgico, cardio, PR peso/reps, reordenar ejercicios, copiar última sesión, descanso por ejercicio, banner de update del SW, CI GitHub Actions. `sw.js → gymtracker-20260728-1`. |
