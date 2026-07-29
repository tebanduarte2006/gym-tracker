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
8. **Bumpear `CACHE` en `sw.js`** en cada deploy (`gymtracker-YYYYMMDD-N`).
   Archivo nuevo → agregarlo a `ASSETS`. Olvidarlo = la PWA sirve código viejo.
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
index.html            Shell mínimo. Un solo <script type="module"> (js/main.js).
styles.css            Design tokens Apple dark + clases g-*. Fuente: rediseño V3 de habitos-app, depurado.
manifest.json         PWA (es-CO, standalone, iconos 192/512/maskable).
sw.js                 Service worker: cache-first versionado + banner de update (main.js lo dispara).
js/
  main.js             Bootstrap: tabs, registro SW, banner update, oferta de seed.
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
  solo-esta-sesión (en memoria). Beep Web Audio + Wake Lock. **Widgets de
  home screen: imposible en PWA de iOS** — no prometérselo.
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

## 8. Pendientes / ideas evaluables

- [ ] Preferencia para display en kg (hoy display fijo lbs; pedirá OK Esteban).
- [ ] Gráfica de volumen por sesión además de peso máx.
- [ ] Recordatorio de export mensual (toast si el último export > 30 días).
- [ ] Editar sets de sesiones finalizadas (hoy solo duración/eliminar).
- [ ] Progresión de cardio (tiempo/velocidad en el tiempo) si Esteban acumula data.

## 9. Historial de cambios estructurales

> Una fila por commit o grupo relacionado. `(pending)` → SHA tras el push.
> Mencionar siempre `sw.js → gymtracker-YYYYMMDD-N` si hubo deploy.

| Fecha | Commits | Cambio |
|-------|---------|--------|
| 2026-07-29 | `(pending)` | **Fix contador + smoke test integral.** `nextWorkoutNumber()` en `stats.js` (+ test): el número de workout ahora toma el máximo entre el contador persistente y el mayor "Workout #N" del historial — tras importar el seed, la primera sesión nueva salía "Workout #1" duplicando nombres históricos; ahora sale #36. Verificado en navegador real (Chrome, servidor local): restauración del seed, los 3 tabs, sesión completa (ejercicio, copiar última sesión, chips, rest timer, finalizar con limpieza de pendientes), cardio, config de descanso por ejercicio, modal de reanudación, eliminación cascade, y el banner de actualización del SW end-to-end. 0 errores de consola. 27/27 tests. `sw.js → gymtracker-20260729-1`. |
| 2026-07-28 | `(pending)` | **Génesis.** App completa creada desde cero tras revisión maestra de habitos-app (35 sesiones/578 sets migrados vía `data/seed.json`). Arquitectura ES modules, 26 tests Node, importador v2/v3 (rescata 167 sets legacy `peso_lbs`), rest timer por timestamp + beep Web Audio + Wake Lock, render quirúrgico, cardio, PR peso/reps, reordenar ejercicios, copiar última sesión, descanso por ejercicio, banner de update del SW, CI GitHub Actions. `sw.js → gymtracker-20260728-1`. |
