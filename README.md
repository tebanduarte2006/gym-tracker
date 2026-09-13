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
   por peso > 0. Esta regla es MÁS importante desde el autollenado: la pantalla
   muestra sets que todavía no has hecho (`Pending` = propuesto). Si algún día
   cuentan, los PRs pasan a ser ficción. Ver §5.2.
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
14. **Nada táctil se da por bueno probándolo con el ratón.** Esta regla nació de
    tres fallos seguidos que pasaron la verificación y llegaron rotos al iPhone:
    el bloqueo de scroll de los modales, el arrastre para reordenar y el
    `preventDefault` del gesto. En escritorio los tres funcionaban. Todo lo que
    sea gesto, scroll o área táctil se verifica con **eventos táctiles reales**
    (`Input.dispatchTouchEvent` vía CDP con `hasTouch: true`), no con
    `page.mouse`. Si no puedes probarlo así, dilo en la entrega en vez de
    marcarlo como verificado. Ver §5.5.

## 3. Arquitectura

```
index.html            Shell ESTÁTICO (título + tabs + esqueleto) + vigilante de arranque (script CLÁSICO) + <script type="module">.
styles.css            Design tokens "Vidrio Negro" (Liquid Glass) + clases g-*. Ver §5.1 antes de tocarlo.
manifest.json         PWA (es-CO, standalone, iconos 192/512/maskable).
sw.js                 Service worker: cache-first versionado; responde 'VERSION' y 'SKIP_WAITING'.
js/
  main.js             Bootstrap: tabs, oferta de seed.
  swupdate.js         Registro del SW, detección/aplicación de versiones, APP_VERSION.
  db.js               IndexedDB: UNA conexión cacheada, índices usados de verdad, bulk import transaccional.
  dom.js              el() / clear() / toast() / guard() / sinMovimiento().
  format.js           [PURO] unidades kg↔lbs, fechas es-CO, duraciones, normalización.
  stats.js            [PURO] isCountable/isPlaceholder, PR peso/reps, Epley, volumen, filas por sesión, set fantasma, sets por músculo, autollenado.
  plates.js           [PURO] calculadora de discos por lado (en libras; display, no almacenamiento).
  muscles.js          [PURO] taxonomía de 18 músculos + migración del etiquetado viejo. Ver §5.3.
  importer.js         [PURO] normaliza backups v2 (habitos-app, con toda su deuda) y v3 (nativo).
  audio.js            Alarma de descanso: clip WAV generado (silencio + tono) por <audio> para que pueda sonar con la pantalla bloqueada + Web Audio inmediato de respaldo. Ver §5 y §5.6.
  wakelock.js         Screen Wake Lock durante sesión activa.
  resttimer.js        Rest timer por TIMESTAMP (endTs fijo), sobrevive lock/background.
  ui/entrenar.js      Tab 1: sesión activa, sets quirúrgicos, cardio, reordenar, copiar última sesión.
  ui/ejercicios.js    Tab 2: directorio, crear/editar, muscle picker.
  ui/progresion.js    Tab 3: hero semanal, PR doble, chart SVG, cardio, export/import.
  ui/modals.js        Bottom sheets, confirmaciones, autocomplete.
  ui/icons.js         Iconos SVG inline.
  ui/dragorder.js     Reordenar por pulsación larga + arrastre (homescreen de iOS).
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
             · status: Pending = PROPUESTO (autollenado, aún no lo has hecho,
               no cuenta para nada) · Done = REGISTRADO · Skipped = solo legacy,
               la app ya no lo crea (no había ninguno en el histórico real)
             · placeholder técnico = Pending + peso 0 + reps 0 (ancla ejercicio↔sesión;
               se eliminan TODOS los Pending al finalizar la sesión, propuestos
               incluidos: lo que no registraste no pasó)
             · unidad: lo que Esteban tecleó (para recordar por-ejercicio su última unidad)
cardio     { id (AI), sesion_id (índice), tipo (free-text), duracion_min,
             velocidad_kmh?, inclinacion?, orden?, ts? }
preferencias { clave, valor }
             · rest_default (90) · contador_workouts · seed_decidido · bar_lbs (45)
             · musculos_migrados (bool): ya se ofreció la migración de §5.3
             · alarma_fondo (bool, default true): la alarma de descanso puede
               ocupar el reproductor del sistema para sonar con la pantalla
               bloqueada. Se apaga desde Progresión → ALARMA DE DESCANSO. Ver §5.6
             · TODA clave nueva va también a PREFS_IMPORTABLES en importer.js,
               o restaurar un backup la pierde en silencio (hay test que lo exige).
```

**Cambios de schema:** subir `DB_VERSION`, migrar en `onupgradeneeded`,
actualizar `importer.js` + tests + esta sección, en el mismo commit.

## 5. Decisiones de producto (confirmadas por Esteban 2026-07-28)

- **Autollenado desde la última sesión, NO plantillas** (revisado 2026-08-12).
  La decisión original ("sin plantillas, armar cada sesión ejercicio por
  ejercicio") queda superada, pero con un matiz que hay que respetar: Esteban
  sigue sin querer **plantillas como entidad** — nada que crear, nombrar,
  editar ni mantener. Lo que quiso es que la app **suponga** que repetirá el
  mismo día: al empezar "Upper A" se proponen los ejercicios y sets de la
  ÚLTIMA sesión finalizada llamada "Upper A", él modifica lo que quiera durante
  el entrenamiento, y lo que registre se convierte solo en el molde de la
  próxima. El template ES la sesión anterior. **No construyas un CRUD de
  plantillas**: sería justo lo que rechazó. Ver §5.2 y `stats.js › autofillPlan`.
- **Display lbs, input lbs/kg** por set (su gym mezcla equipos). El toggle
  recuerda la última unidad usada por ejercicio.
- **Rest timer:** default 90s → configurable por ejercicio (persistente) o
  solo-esta-sesión (en memoria), desde la sesión activa **o** desde el detalle
  del ejercicio (que también ajusta el `rest_default` global). Beep Web Audio +
  Wake Lock. **Widgets de home screen y Live Activities de lock screen:
  imposibles en una PWA de iOS** (requieren app nativa con WidgetKit/ActivityKit)
  — no prometérselo.
- **Alerta de fin de descanso — límite honesto (revisado 2026-09-13):** con la
  app en background o la pantalla bloqueada, iOS congela los timers de JS y
  **suspende el AudioContext**. El *conteo* sí sobrevive (va por timestamp
  fijo); la *alerta* no está garantizada. El mecanismo anterior —programar el
  beep en el reloj de Web Audio— no podía funcionar con la pantalla bloqueada,
  porque muere con el contexto suspendido; Esteban lo reportó exactamente así.
  Ahora la alarma va por un **elemento `<audio>` reproduciendo un clip generado
  al vuelo** (silencio del largo del descanso + el tono al final): la
  reproducción de medios es lo único que iOS deja seguir con la pantalla
  apagada. Sigue siendo **best-effort** y tiene un coste real (puede pausar tu
  música), por eso es la preferencia `alarma_fondo`. Detalle completo en §5.6.
  La defensa de verdad sigue siendo el Wake Lock: durante la sesión la pantalla
  no se apaga sola. **No escribas en el README ni en la UI que el aviso suena
  SIEMPRE con la pantalla bloqueada.**
- **Cardio:** tipo free-text + duración min + velocidad/inclinación opcionales.
- **Estética:** rediseñada el 2026-08-12 a **"Vidrio Negro"** — negro real,
  grises transparentes y material Liquid Glass de Apple, con acento **platino
  `#EDEDF0`**. Esteban eligió platino sobre naranja explícitamente: la app es
  blanco y negro, y el único color que sobrevive es el verde de "hecho" y el
  rojo destructivo. **El naranja `#FF9F0A` heredado ya NO se usa en ninguna
  parte** — si lo ves reaparecer, es una regresión. Reglas duras en §5.1.
- **Ícono:** su imagen de mancuerna cartoon, sin distorsión. Fondo blanco.
- **Mental/hábitos:** fuera del alcance para siempre. Esto es SOLO gym.
- **Registro en el vault:** export mensual → un agente lo vuelca a
  `20 Areas/Salud/Gym/` del vault Ideaverse según
  `90 Sistema/Formato Registro Gym.md`. Ver ese doc antes de tocar el formato.

### 5.1 Sistema de diseño "Vidrio Negro" (leer antes de tocar `styles.css`)

Dirección aprobada por Esteban el 2026-08-12 tras ver una propuesta con las dos
opciones de acento maquetadas. **Ocho reglas; las cinco primeras se rompen solas
si no se leen.**

1. **El vidrio es la capa de CONTROLES, nunca la de contenido.** Barras
   flotantes, botones y el temporizador de descanso son vidrio. Los números de
   las series van sobre superficie legible: un peso mal leído es el fallo más
   caro que puede tener esta app.
2. **Máximo DOS capas de vidrio apiladas**, la de arriba siempre más opaca.
   Tres capas es niebla. Por eso el bottom sheet (`.g-modal`) es **sólido**
   `#121214` y no vidrio: ya está sobre el desenfoque del overlay.
3. **Sin fondo no hay vidrio.** Sobre negro absolutamente plano el
   `backdrop-filter` no tiene nada que muestrear y todo se degrada a rectángulos
   grises. Los halos radiales de `body::before` son lo que hace que el material
   funcione — **no los borres "porque no se ven"**: se nota justo cuando faltan.
4. **El acento sólido es para UNA acción por pantalla.** Fondo platino + texto
   `--on-accent`. En cuanto hay dos, deja de significar "esto es lo principal".
   El defecto del diseño anterior era exactamente ese: el naranja estaba en el
   hero, las pastillas, la gráfica, el cronómetro, los enlaces, el badge de PR,
   los botones y el banner a la vez.
5. **El rojo es el único color de la app y NO es acento.** Solo marca lo que
   borra o cierra algo; jamás decora. El verde desapareció con los chips de
   estado (§5.2): la app es blanco, negro, grises y un rojo.
6. **44 px de área táctil, piso innegociable.** Se crece el ÁREA con padding y
   margen negativo, no el dibujo (ver `.g-set-del`, `.g-rest-skip`).
7. **Radios concéntricos:** hijo = padre − separación. Usa la escala
   `--r-xs`…`--r-xl`, no números sueltos.
8. **Inputs a 16px como mínimo.** Por debajo, iOS hace zoom automático al
   enfocar el campo y descoloca la pantalla en pleno entrenamiento.

**Los colores del SVG viven en `styles.css`**, no en atributos desde JS
(`.g-chart-line`, `.g-chart-area`, `.g-chart-dot`, `.g-chart-grid`). El diseño
anterior llevaba `#FF9F0A` escrito a mano en cuatro líneas de `progresion.js` y
cualquier cambio de paleta las dejaba atrás.

**El movimiento es parte del sistema, no un adorno que se añade al final.**
Las reglas de transiciones (qué se anima, cuánto dura y por qué el orden de
pintar importa más que la animación) están en §5.8.

**Accesibilidad: no es opcional en Liquid Glass.** Apple lo trata como parte del
material, y `styles.css` responde a las tres preferencias del sistema:
`prefers-reduced-transparency` (el vidrio se vuelve sólido),
`prefers-contrast` (sube texto y bordes) y `prefers-reduced-motion`. Si añades un
componente de vidrio, añádelo también a la lista del primer bloque.

### 5.2 Modelo de sets: propuesto vs registrado (leer antes de tocar `entrenar.js`)

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

### 5.3 Taxonomía de músculos (leer antes de tocar `js/muscles.js`)

Esteban reportó (2026-08-12) "muchos ejercicios con músculos raros, mismo
músculo duplicado" y pidió una lista real y definitiva. La auditoría de sus 36
ejercicios encontró tres defectos, y ninguno estaba en sus datos: estaban en la
lista que ofrecía el selector.

1. **Número inconsistente.** La constante decía `Aductores` y sus datos decían
   `Aductor`; igual con `Abductor(es)` y `Trapecio(s)`. El selector añadía a la
   lista fija los músculos que descubría en la base, así que mostraba **los dos
   a la vez**: dos filas casi idénticas que parecen un error de la app.
2. **Granularidad mezclada.** `Espalda` convivía con `Dorsales`; `Hombros` con
   `Hombro frontal`; `Piernas` con `Cuádriceps`; `Core` con `Abdominales`. Poder
   marcar la región Y su parte hace que **el volumen por músculo cuente el mismo
   set dos veces** y que dos filas del informe digan lo mismo.
3. **Etiquetas vagas.** 11 ejercicios estaban marcados solo como `Espalda` u
   `Hombros`, que para decidir qué entrenar no dice nada.

**La lista definitiva: 18 músculos, un solo nivel de granularidad.** Se separa un
músculo de su vecino SOLO si esa separación cambia una decisión de entrenamiento
— por eso los deltoides van por sus tres cabezas (la trampa clásica es machacar
el frontal y no tocar el posterior) pero el pecho no se parte en superior e
inferior: eso es ángulo, no músculo, y obligaría a adivinar en cada ejercicio.

| Empuje | Tirón | Core | Pierna |
|---|---|---|---|
| Pecho · Deltoides frontal · Deltoides lateral · Tríceps | Dorsales · Trapecios · Deltoides posterior · Bíceps · Antebrazos | Abdominales · Oblicuos · Lumbares | Cuádriceps · Isquiotibiales · Glúteos · Aductores · Abductores · Gemelos |

**El selector es una LISTA CERRADA.** Ya no hay buscador ni "Crear «X»", y ya no
se añaden los músculos descubiertos en la base: eso es exactamente lo que dejó
nacer `Aductor` junto a `Aductores`. Con 18 caben todos en pantalla agrupados.
Si falta un músculo de verdad, se añade a `js/muscles.js` y **solo ahí**.

**La migración se OFRECE, no se aplica sola** (`main.js › maybeOfferMuscleMigration`).
Reescribe el etiquetado de todo su historial, y eso es suyo: el sheet enseña
ejercicio por ejercicio el antes y el después, y si dice que no se recuerda en
`musculos_migrados` y no se vuelve a preguntar.

**Regla de la migración: traducir, no inventar.** `Espalda` en un remo sí quiere
decir dorsales y trapecios — eso es traducir lo que la etiqueta ya significaba.
Añadirle `Bíceps` sería una decisión de entrenamiento disfrazada de limpieza de
datos, y le triplicaría el volumen de bíceps sin que entienda por qué. Lo que no
se puede traducir sin adivinar se queda como está y se marca para que lo ajuste
él. La tabla `POR_EJERCICIO` es de **una sola vez**, para sus 36 ejercicios de
agosto de 2026: un ejercicio nuevo se crea ya con la lista canónica.

### 5.4 Reordenar arrastrando (`js/ui/dragorder.js`)

Sustituye los botones ↑ / ↓, que dejaban la fila de herramientas con cinco
controles y convertían reordenar seis ejercicios en quince toques. Pulsación
larga (420 ms) + arrastre, como el homescreen del iPhone.

**Al entrar en modo reordenar TODAS las tarjetas colapsan al nombre**
(`.g-reordenando`). No es cosmético: arrastrar la tarjeta abierta (~315 px) por
una pantalla de 896 px es mover un bloque que tapa media lista, y con alturas
desiguales el hueco que deja nunca coincide con el que ocupa. Colapsadas miden
todas ~53 px, la lista entera pasa de 610 px a 368 px —cabe de golpe en
pantalla— y el gesto se vuelve exacto. Es lo que hace el homescreen del iPhone
al entrar en modo de reorganización. `dragorder.js` mide **después** de aplicar
la clase; medir antes guardaría la altura de la tarjeta abierta y todo el
cálculo de huecos saldría mal.

Ojo con la especificidad: `.g-ex-card.open .g-ex-body` son tres clases y ganaba,
así que la tarjeta abierta seguía midiendo 315 px mientras las demás bajaban a
53 — justo el desnivel que este modo existe para eliminar. Por eso la regla
repite `.open` explícitamente.

**Fluidez** (medido: 61 fps durante el arrastre, desfase 0 px entre el centro de
la tarjeta y el dedo):
- El `gap` se lee UNA vez en `medir()`. Llamar a `getComputedStyle` en cada
  `pointermove` fuerza un recálculo de estilo por evento, y `pointermove` llega
  más veces por segundo que frames hay: era la fuente principal de tirones.
- Pintar va siempre dentro de un `requestAnimationFrame`, nunca directo desde el
  evento.
- `will-change: transform` en las tarjetas del modo reordenar, o el navegador
  repinta la lista entera en cada frame.
- Al colapsar, la tarjeta ya no está bajo el dedo: se calcula un ancla una sola
  vez para centrarla en él, en lugar de dejarla desplazada todo el gesto.
- El `scale` del "levantar" es propiedad independiente, **no**
  `transform: scale()`, para que componga con el `translateY` sin pisarlo.

Cuatro cosas más que parecen detalles y no lo son:

1. **La pulsación larga se cancela si el dedo se mueve antes de tiempo.** El
   gesto de scroll y el de arrastrar nacen idénticos; sin ese umbral, cualquier
   scroll que empiece sobre una tarjeta acabaría arrastrándola.
2. **El destino se calcula con la posición del DEDO**, no acumulando
   desplazamiento. La primera versión sumaba alturas y fallaba justo en el caso
   normal: durante el entrenamiento hay una tarjeta abierta (~400 px) entre
   varias cerradas (~90 px), y arrastrar la abierta la dejaba dos posiciones más
   abajo de donde apuntaba el dedo.
3. **La cabecera lleva `data-drag-handle`.** Es un `<button>` (abre y cierra el
   ejercicio) y sin esa marca la guarda que impide secuestrar controles no
   dejaba ni empezar el gesto.
3b. **`pointermove` / `pointerup` viven en WINDOW, no en el contenedor.**
   Colgados del contenedor había un fallo real: si el dedo salía de la lista
   antes de que venciera la pulsación larga —hacia el cronómetro de arriba, por
   ejemplo— el contenedor dejaba de recibir eventos, la cancelación por
   movimiento nunca llegaba y el arrastre arrancaba igual con el dedo ya lejos.
   En `window` se ve el gesto entero pase por donde pase.
4. **Se traga el `click` posterior al arrastre.** El navegador lo dispara igual
   sobre el asa, y sin eso reordenar dejaba el ejercicio colapsado solo.

El `gap` va en `.g-ex-list`, no como `margin-bottom` de la tarjeta: `dragorder.js`
lo lee con `getComputedStyle` para calcular el hueco. Si lo devuelves a `margin`,
el arrastre calcula mal.

**Tarjeta colapsada = nombre + contador, nada más** (fuera del modo reordenar).
La línea de músculos se muestra solo al abrir: "Cuádriceps · Isquiotibiales ·
Glúteos · Aductores" se partía en dos líneas y hacía esa tarjeta más alta que las
demás, que es justo lo que descoloca una lista que se escanea de un vistazo.

**Coste conocido:** sin ↑ / ↓ no hay forma de reordenar con VoiceOver ni con
teclado. Es el precio del gesto que pidió Esteban; si algún día importa, la
salida es un modo "reordenar" explícito, no devolver los botones a la fila.

### 5.5 Gestos táctiles en iOS (leer antes de tocar cualquier gesto)

Tres entregas seguidas llegaron rotas al iPhone por creencias falsas sobre cómo
funciona el táctil en iOS Safari. Esteban resumió la tercera así: *"el hold y
click para cambiar el orden NO funciona bien. A veces sí, a veces no, a veces se
selecciona el ejercicio pero es imposible moverlo. En vez de moverse, solo
scrollea. Funciona el 10% de las veces"*. Son cuatro reglas, y las cuatro
parecen detalles hasta que te comes un gesto inutilizable:

1. **`preventDefault()` sobre `pointermove` NO cancela el scroll en iOS.** Solo
   lo cancela sobre **`touchmove`**, y solo si el listener se registró con
   `{ passive: false }`. Esta única línea es la diferencia entre un arrastre que
   funciona y uno que scrollea la página mientras la tarjeta se queda quieta.
2. **`touch-action: none` aplicado al empezar el gesto llega tarde.** El
   navegador decide si un toque puede scrollear **cuando el toque empieza**;
   cambiar la propiedad a mitad del gesto no deshace esa decisión. Sirve como
   refuerzo, nunca como mecanismo principal.
3. **`-webkit-touch-callout` y `user-select` van PERMANENTES en el asa**, no al
   entrar en modo arrastre. La lupa de selección y el menú contextual de iOS
   aparecen sobre los 500 ms; si tu pulsación larga vence cerca de ahí, compiten
   con ella. Por eso `MS_LARGA` es 320 ms y no 420.
4. **Un umbral de cancelación de 8 px es demasiado fino para un pulgar.** El
   dedo tiembla, más aún sudado y con prisa. 10 px distingue igual de bien un
   scroll de una pulsación larga y deja de cancelar el gesto por temblor.

**El click posterior al gesto no se puede tragar solo con el evento.** Tras
reordenar, iOS a veces dispara el `click` de la cabecera, a veces no, y a veces
lo dispara después del re-render — así que el ejercicio se abría solo y, en
palabras de Esteban, *"confunde mucho"*. El interceptor en fase de captura se
mantiene, pero la garantía es un **sello de tiempo**: `entrenar.js` guarda cuándo
terminó el último arrastre y la cabecera ignora los clicks de los 400 ms
siguientes. Un sello de tiempo es determinista; el orden de los eventos táctiles
en iOS no lo es.

**Tampoco se auto-abre la primera tarjeta tras reordenar.** Esto se resolvió
del todo el 2026-09-13: `refreshExercises` ya **no abre ninguna tarjeta nunca**
(ver §5.7), así que el caso desapareció por la raíz en vez de estar parcheado
con una ventana de tiempo tras el arrastre.

**Cómo se verifica un gesto** (y sin esto NO está verificado): contexto con
`devices['iPhone 11']` + `hasTouch: true`, y el gesto disparado con
`Input.dispatchTouchEvent` por CDP. Hay que comprobar las cuatro cosas a la vez,
porque fallar una sola reproduce el síntoma que reportó Esteban:

| Comprobación | Por qué |
|---|---|
| entra en modo arrastre | la pulsación larga vence |
| la tarjeta sigue al dedo | el `transform` cambia de verdad |
| `window.scrollY` NO cambia | el `touchmove` sí se está previniendo |
| el orden cambió al soltar | el destino se calculó bien |

Y las tres que garantizan que no rompiste lo de siempre: deslizar rápido sobre
una tarjeta **scrollea** (no arrastra), un toque corto **abre** la tarjeta, y los
botones de dentro (registrar, borrar) **siguen respondiendo**.

### 5.6 Alarma de descanso (leer antes de tocar `js/audio.js`)

Reescrita el 2026-09-13 sobre dos reportes de Esteban que son problemas
distintos y tienen arreglos distintos.

**A) "Muy suave y muy grave; con la música y el ruido del gimnasio no la oigo."**
El beep eran dos **senoidales puras** de 880 y 1175 Hz a ganancia 0.35. Una
senoidal pura es la peor forma de onda posible para un aviso en ruido: toda su
energía está en una frecuencia y el ruido de banda ancha de un gimnasio la tapa
entera. Tres cambios, los tres necesarios:

1. **2000 Hz con armónicos** (fundamental + 2º + 3º), no una senoidal. El oído
   humano es más sensible entre 2 y 4 kHz y el altavoz del iPhone rinde mucho
   mejor ahí que en los graves — que es literalmente lo que él describió.
2. **Fondo de escala.** La normalización va por el **pico real** de la onda
   (1.4198, medido), no por la suma de las amplitudes (1.8): dividir por la suma
   dejaba la alarma ~3 dB por debajo de lo que el clip permite.
3. **Patrón, no un pitido:** seis pulsos de 140 ms (3 + pausa + 3). Un sonido
   con ritmo se distingue del ruido ambiente aunque el nivel sea parecido.

**B) "Con el celular bloqueado no suena hasta que entro a la app."** Cierto, y
el mecanismo anterior NO podía arreglarlo. `scheduleBeep` programaba el tono en
el reloj del AudioContext, e **iOS suspende el AudioContext al bloquear la
pantalla**: se programaba algo en un reloj que se para.

Lo único que iOS deja seguir con la pantalla apagada es la **reproducción de un
elemento `<audio>`** (es lo que hace cualquier reproductor de música web). Pero
un `<audio>` no se puede "programar" para dentro de 90 s: programar exige que el
JS corra a esa hora, y el JS está congelado. Así que se le da **ya** un clip que
dura exactamente el descanso: **silencio + el tono al final**, generado byte a
byte en memoria (`crearWav`). El reloj que cuenta pasa a ser el del reproductor
del sistema, no el nuestro.

Cinco cosas que parecen detalles y no lo son:

1. **Un solo elemento `<audio>`, reutilizado.** El permiso de reproducción de
   iOS es del ELEMENTO, y `startRest()` se llama dentro de un `.then()` de
   IndexedDB, o sea ya fuera del gesto del usuario. Por eso el primer toque en
   la app reproduce 50 ms de silencio en ese elemento para dejarlo autorizado el
   resto de la vida de la página, y después solo se le cambia el `src`. Crear un
   elemento por descanso lo rompería en el primer descanso.
2. **Blob URL, no data URI.** Un data URI obliga a pasar el clip por base64:
   +33 % de tamaño y una cadena de 2 MB construida en medio del entrenamiento.
3. **PCM 8 bits a 16 kHz.** El silencio es exactamente 128 (silencio digital, no
   "casi") y 90 s ocupan 1.4 MB que se liberan al terminar el descanso. Hay un
   tope de 900 s: por encima el WAV pesaría más que la app entera.
4. **Se corrige la latencia de arranque.** Cargar el clip y empezar cuesta unos
   milisegundos y ese retraso se acumularía entero al final; tras `play()` se
   adelanta el cabezal lo que se tardó.
5. **`alarmWasLost()` mira el CABEZAL del reproductor**, no el estado del
   AudioContext: si el clip llegó al tono, sonó; si iOS lo paró antes, no sonó y
   el rest timer dispara la alarma inmediata al volver. Es un hecho observable,
   no una suposición — y es lo que evita sonar dos veces en el caso normal.

**El coste, y por qué hay un interruptor.** Mientras dura el descanso la app
ocupa el "now playing" de iOS y **puede pausar la música que estés oyendo**. Eso
no se puede decidir por él: es la preferencia `alarma_fondo` (Progresión →
ALARMA DE DESCANSO), encendida por defecto. Apagada, la app **no toca el
reproductor del sistema ni para autorizar el elemento** — apagar tiene que
significar eso exactamente, no "casi". Junto al interruptor hay un botón de
**probar**, porque el volumen de una alarma no se evalúa en una sala en
silencio: hay que oírla en el gimnasio antes de confiarle un descanso.

**Lo que NO se puede prometer:** que suene siempre con la pantalla bloqueada.
Si iOS mata la reproducción de una PWA en segundo plano, se pierde igual. En
esta entrega esto se verificó en **Chromium**, no en el iPhone: el clip se arma,
se reproduce, dura descanso + patrón, se cancela al saltar el descanso y el
respaldo salta cuando se simula que el sistema para la reproducción. **El
comportamiento real con la pantalla bloqueada solo lo confirma el iPhone.**

### 5.7 Las tarjetas de ejercicio NO se abren solas (2026-09-13)

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

### 5.8 Movimiento y transiciones (2026-09-13)

Esteban: *"las transiciones entre tabs, o al espichar cualquier botón que abre,
cierre o haga cualquier cosa, se sienten muy bruscas. Especialmente el cambio de
tabs: hago click y muestra un flash de lo que hay en esa página. Nada es
smooth."*

**Lo primero que hay que entender: el "flash" no era una animación que faltaba,
era el ORDEN de las operaciones.** `switchTab` marcaba el panel como visible y
DESPUÉS lo pintaba — y pintar aquí es `clear()` más rellenar cuando contesta
IndexedDB. O sea que el panel entraba en pantalla vacío y el contenido caía
encima uno o dos frames más tarde. Medido en Chromium antes del cambio: al tocar
Ejercicios el panel aparecía con **202 px** de alto y saltaba a **2832 px**;
Progresión, 435 → 2824; Entrenar aparecía literalmente **vacío**. Ninguna
animación arregla eso: con fundido o sin él, lo que ves es contenido a medias.

Las cuatro reglas que salen de ahí:

1. **Se pinta oculto y se revela lleno.** Los tres `render*` DEVUELVEN una
   promesa que resuelve cuando sus datos ya están en el DOM; `main.js` pinta el
   panel todavía en `display:none` y solo entonces lo enseña. Si añades una
   pantalla o una carga nueva, **encadena su promesa** o volverás a enseñar el
   panel a medias — es el fallo que este apartado existe para impedir.
2. **El control responde al instante; el contenido puede tardar un pelo.** La
   pastilla de la pestaña se marca en el mismo tick del toque, sin esperar
   datos. Al revés se siente como si la app hubiera ignorado el dedo.
3. **Siempre hay un tope de espera** (`TOPE_MS`, 260 ms). Un parpadeo raro es
   mejor que una app que parece colgada porque IndexedDB se durmió. Lo mismo en
   el arranque: el esqueleto se queda hasta que el primer tab tiene datos, pero
   no más de `ARRANQUE_TOPE_MS`.
4. **Nada de scroll animado mientras cambia el contenido.** El `scrollTo` suave
   que había animaba la página justo cuando el contenido se reemplazaba debajo:
   dos movimientos a la vez que no tienen nada que ver. Ahora el scroll vuelve
   arriba de golpe y en el mismo instante del relevo. El scroll suave se queda
   solo para tocar la pestaña en la que ya estás, que no repinta nada.

**Tocar la pestaña activa ya no re-renderiza.** Repintaba la pantalla entera —el
parpadeo completo— por el gesto más inofensivo de la barra. Ahora sube al
inicio, como cualquier app de iOS.

**Duraciones.** 120 ms para irse, 200 ms para entrar, 200 ms para cerrar un
sheet, 260 ms (`--base`) para desplegar una tarjeta. Nada por encima de 300:
esto se usa entre series, con prisa. Y la curva de salida (`--ease-in`) no es la
de entrada: lo que llega desacelera, lo que se va acelera.

**Abrir y cerrar sin medir alturas en JS.** Una tarjeta de ejercicio no tiene
altura conocida, y medir con `scrollHeight` en cada apertura es volver a meter
lecturas de layout en el camino del dedo (lección 38). La forma sin JS es una
rejilla de una fila que va de `0fr` a `1fr` — es lo que hace `colapsable()` en
`entrenar.js`. Tres cosas que hay que respetar si lo tocas:

- **Son dos divs, no uno.** El de dentro recorta. Si el contenido con padding
  cuelga directo de la rejilla, ese padding sigue midiendo con la fila a cero y
  la tarjeta cerrada queda 14 px más alta.
- **`visibility: hidden` al terminar el cierre.** `display:none` quitaba lo
  cerrado del foco por teclado y de VoiceOver gratis; recortar con `overflow`
  no. La visibilidad se apaga con retraso (al abrir, al instante) para no cortar
  la animación.
- **En modo reordenar el colapso es INSTANTÁNEO** (`transition: none`).
  `dragorder.js` mide las tarjetas en el mismo tick en que pone
  `.g-reordenando`, y una altura a media animación le daría bandas equivocadas:
  el cálculo del destino del arrastre entero sale mal. Y el selector repite
  `.open` por lo de siempre (§5.4 y lección 37).

Si un navegador no interpola `fr` (Safari < 16), el resultado es el salto
instantáneo de antes: se degrada a lo que ya había.

**La curva de lo que cambia de TAMAÑO no es la de lo que se mueve** (corregido
el 2026-09-13, segunda pasada). Esteban probó la versión anterior: *"ya no es de
golpe como antes, pero se sigue sintiendo rough, no es fluida"*. No era falta de
frames —medido con la CPU 6× más lenta, mediana de 16.7 ms y un solo frame
largo— era el **perfil del movimiento**. `--ease` (`.32,.72,0,1`, la curva
"snappy" de Apple) recorre el 86% del camino en el primer 30% del tiempo: con un
chevrón que gira eso es carácter, y con 254 px de tarjeta es un latigazo seguido
de un reptar. Medido frame a frame al abrir un ejercicio:

| | Salto máximo | Salto p90 | Cola (frames < 2 px) |
|---|---|---|---|
| `--ease` `.32,.72,0,1` | **66 px** | 53 px | 6 |
| `--ease-size` `.25,.1,.25,1` | **37 px** | 34 px | 0 |

De ahí el token **`--ease-size`**, y la regla: `--ease` para transformaciones
(se componen en la GPU y suelen recorrer poca distancia), `--ease-size` para
altura, anchura o cualquier cosa que cambie de tamaño. Un salto de 66 px entre
dos frames se ve; el ojo sigue el borde que avanza.

**El contenido entra con fundido, no solo destapado por un borde.** Con el puro
recorte, cada frame el texto vuelve a encajar en la rejilla de píxeles y el
borde en movimiento se lee como un barrido duro. `opacity` y `transform` los
compone la GPU: no añaden ni un cálculo de layout por frame.

**`contain: layout paint` en el recorte no es un adorno.** Sin él, cambiar la
altura obliga al navegador a reconsiderar el layout de la página entera en cada
frame. Medido con la CPU **10×** más lenta —peor caso que un iPhone 11— durante
la apertura:

| | Frames por encima de 32 ms |
|---|---|
| sin contención | 23 de 94 (24%) |
| con `contain: layout paint` | 8 de 106 (**7.5%**) |

Es seguro aquí porque el recorte ya lleva `overflow:hidden` y lo único
posicionado dentro (el círculo de `.g-set-mark`) se ancla a su propio padre
`relative`. **No pongas `contain: size`**: la rejilla necesita medir el contenido
para saber cuánto vale `1fr`, y con contención de tamaño mediría cero.

Dato de la misma medición, por si algún día hace falta: quitar el
`backdrop-filter` de las tarjetas ahorraba menos que la contención (13 de 99
frames largos frente a 8 de 106) y cuesta el material entero. No es el camino.

**Los sheets se cierran animados.** Entraban deslizando y desaparecían de golpe
con un `overlay.remove()` seco. Media transición se siente peor que ninguna, y
el cierre es el momento en que más veces al día ves ese componente. El scroll
del fondo se suelta YA, no al terminar la animación: el sheet que sale está en
`position:fixed` y no se mueve con la página, así que devolver el fondo a su
sitio antes no se ve — y esperar 200 ms para poder scrollear sí se siente.

**Respuesta al toque en TODO lo que se toca.** Media app la tenía y media no, y
ahí estaba la otra mitad del "nada es smooth". Botones grandes se hunden un pelo
(`scale(.985)`); filas y cabeceras se tiñen, con la tinta entrando
**instantánea** y saliendo con fundido — al revés el aviso llega cuando ya
levantaste el dedo. Nada de `scale` en controles pequeños: en un botón de 32 px
no se ve y solo emborrona el texto.

**`prefers-reduced-motion` tiene que apagarlo TODO, y el CSS solo apaga la
mitad.** El JS también programa esperas (los 120 ms del desvanecido, los 200 ms
del cierre del sheet) y una espera sin animación detrás no es una transición: es
un retraso. Por eso existe `sinMovimiento()` en `dom.js` y hay que consultarla en
cualquier espera nueva. En el CSS, el bloque de reducción también pone
`transition-delay: 0s`.

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
16. **Un aviso que compite con el fondo no existe.** El banner de actualización
    era una píldora gris de 13px sobre el título; Esteban lo describió como
    "casi imperceptible" y era el ÚNICO canal para enterarse de una versión
    nueva. Un aviso crítico se dimensiona por su importancia, no por su
    elegancia.
17. **Un handler no puede quedarse con una referencia viva capturada al crear
    la UI.** El botón del banner guardaba el `ServiceWorker` del momento en que
    se pintó; si llegaba otro worker después, el capturado quedaba `redundant`
    y su `postMessage` no hacía NADA — el botón se veía pulsado y no pasaba
    nada. Se lee el estado en el momento del clic, no en el del render. Y toda
    acción que depende de un mensaje asíncrono lleva timeout de respaldo.
18. **Un valor "de arranque" congelado hace sorda a la pestaña.** `hadController`
    se leía una vez al cargar; una pestaña abierta desde la primera instalación
    se quedaba sin detectar actualizaciones el resto de su vida. Se consulta
    `navigator.serviceWorker.controller` en el momento de decidir.
19. **Arreglar la mitad de un bug deja la otra mitad viva.** La lección 18 se
    aplicó a `listo()` pero NO a `controllerchange`, que siguió leyendo el mismo
    `hadController` congelado. Resultado: la pestaña sí detectaba y aplicaba la
    versión nueva (`SKIP_WAITING`), pero jamás recargaba — la pantalla seguía
    corriendo el JS viejo en memoria, sin banner y sin síntoma. Cuando encuentres
    un patrón defectuoso, **busca TODAS sus apariciones**, no solo la que falló.
20. **Verificar solo en Chrome de escritorio valida bugs de iOS.** El bloqueo de
    scroll del fondo (`body{overflow:hidden}`) se dio por bueno porque en Chrome
    se veía perfecto; en iOS Safari esa propiedad no bloquea nada y el fondo se
    siguió arrastrando bajo el sheet. Solo `position:fixed` + restaurar `scrollY`
    funciona. Antes de marcar como resuelto algo táctil o de layout, pregúntate
    si el navegador donde lo probaste se comporta como el iPhone 11.
21. **Una promesa resuelta no significa trabajo terminado.** `reg.update()`
    resuelve con el worker nuevo todavía en `installing`: en ese instante
    `reg.waiting` es `null` y el botón manual respondía "Ya tienes la última
    versión". Un diagnóstico que miente es peor que no tener diagnóstico.
22. **Precargar todas las pantallas al arrancar no es optimizar.** `boot()`
    pintaba los tres tabs, o sea nueve lecturas completas de IndexedDB antes de
    que se viera nada — encima del arranque en frío que ya costó tres arreglos.
    Se pinta el tab visible; `switchTab` ya re-renderiza en cada cambio.
23. **El mismo dato pedido N veces en un render es un bug, no un detalle.** Cada
    card de ejercicio hacía su propio `dbGetAll('sesiones')` completo: con 8
    ejercicios, 8 barridos de la tabla entera para pintar una pantalla. Si un
    dato es igual para todas las filas, se carga UNA vez arriba y se pasa hacia
    abajo.
24. **Un color escrito a mano en JS sobrevive a todos los rediseños.**
    `progresion.js` tenía `#FF9F0A` en cuatro `setAttribute` de SVG. Ningún
    cambio de `styles.css` los alcanzaba, así que la app quedaba con una paleta
    nueva y cuatro trazos del color viejo. Los colores viven en CSS; el JS pone
    clases.
25. **La sugerencia va en `placeholder`, no en `value`.** El set fantasma
    tentaba a precargar el valor de verdad; con eso, registrar sin querer lo de
    la última vez sería un toque y corregir un peso exigiría borrar antes de
    escribir. Como placeholder el atajo es opt-in y teclear encima funciona
    igual que siempre.
26. **Aritmética de discos en enteros.** `2.5 + 2.5 + 2.5` en coma flotante deja
    residuos de 1e-15 que convierten un resultado exacto en "sobra 0.0 lbs".
    `plates.js` cuenta en unidades de 0.2 lb con enteros. Hay test.
27. **Una preferencia nueva que no entra en `PREFS_IMPORTABLES` se pierde en
    silencio** al restaurar un backup. No rompe nada visible, que es lo que la
    hace peligrosa. Hay un test que exige que la lista blanca cubra todas las
    claves que la app escribe: si añades una preferencia, ese test te lo dirá.
28. **Quitar un control no es quitar el concepto.** Los chips de estado sobraban
    como INTERFAZ (Esteban sabe si hizo un set), pero el dato que codificaban es
    lo único que separa "esto lo levanté" de "esto propone la app". Cuando te
    pidan eliminar algo, separa el control del invariante: casi siempre se puede
    tirar el primero y deducir el segundo de un gesto que ya existe.
29. **Un valor por defecto que se autopropaga necesita una salida visible.** El
    molde de la próxima sesión es la sesión anterior, así que cualquier cosa que
    se caiga hoy se cae para siempre. El aviso al finalizar, nombrando los
    ejercicios que quedaron sin registrar, es lo único que impide que el plan se
    encoja solo sin que nadie lo note.
30. **Comparar texto libre por igualdad es un bug esperando fecha.** "Upper A" y
    "upper a " son el mismo día para una persona y dos días distintos para un
    `===`. Se normaliza SIEMPRE (`normalizeKey`) y, mejor aún, se hace elegir de
    una lista en vez de escribir.
31. **Una lista de opciones "abierta" se contamina sola.** El selector de
    músculos permitía crear entradas nuevas Y añadía las que descubría en la
    base: bastó que la constante dijera `Aductores` y un dato dijera `Aductor`
    para que el usuario viera dos opciones idénticas y no entendiera cuál elegir.
    Un vocabulario controlado se define en UN sitio y se cierra.
32. **Mezclar una región con sus partes en la misma lista es doble conteo.**
    `Espalda` y `Dorsales` marcables a la vez hacían que un set sumara dos veces
    en el volumen por músculo. Una taxonomía tiene UN nivel de granularidad, o no
    es una taxonomía.
33. **Migrar datos no es adivinar datos.** Traducir `Espalda` de un remo a
    dorsales y trapecios es traducir lo que la etiqueta ya significaba; añadirle
    bíceps habría sido una decisión de entrenamiento disfrazada de limpieza. Lo
    que no se puede traducir sin inventar se deja marcado para que lo decida el
    dueño de los datos — y la migración se OFRECE con el diff a la vista, nunca
    se aplica sola.
34. **Un gesto largo y un scroll nacen iguales.** Solo se distinguen por lo que
    pasa en los primeros 400 ms. Si tu pulsación larga no se cancela al primer
    movimiento del dedo, has roto el scroll de esa pantalla.
35. **Con alturas variables, el dedo es la única referencia fiable.** Calcular el
    destino de un arrastre acumulando alturas funciona con listas uniformes y
    falla en cuanto un elemento está expandido. Se compara la posición del
    puntero contra las bandas originales.
36. **Un gesto se escucha en `window`, no en el elemento donde nace.** Solo el
    `pointerdown` pertenece al contenedor; en cuanto el dedo puede salirse de él
    —y siempre puede— los `pointermove` y `pointerup` colgados del contenedor
    dejan de llegar y el gesto se queda a medias en un estado imposible.
37. **La especificidad CSS decide, no el orden en que escribiste las reglas.**
    `.g-reordenando .g-ex-body` (dos clases) no podía contra
    `.g-ex-card.open .g-ex-body` (tres), así que el modo compacto colapsaba
    todas las tarjetas MENOS la abierta — justo la que más falta hacía. Cuando
    una regla "no se aplica", cuenta las clases antes de tocar nada más.
38. **`getComputedStyle` dentro de un manejador de gesto es un freno.** Se
    llamaba una vez por `pointermove`, y `pointermove` llega más veces por
    segundo que frames hay: cada llamada fuerza un recálculo de estilo. Lo que
    no cambia durante el gesto se mide UNA vez al empezarlo, y el pintado va
    dentro de un `requestAnimationFrame`.
39. **El vigilante de un fallo no puede vivir dentro de lo que puede fallar.**
    Si `js/main.js` no carga, ningún módulo corre — así que la red de seguridad
    del arranque es un `<script>` clásico en `index.html`, fuera del grafo de
    módulos. Un arranque que puede quedarse colgado necesita SIEMPRE una salida
    que no dependa de que ese arranque funcione.
40. **En iOS el scroll solo se cancela desde `touchmove`.** `preventDefault()`
    sobre `pointermove` no hace nada, y el listener tiene que ser
    `{passive:false}` o el navegador lo ignora. Un arrastre que "a veces
    funciona y a veces solo scrollea" es casi siempre esto.
41. **Las propiedades que gobiernan un gesto se ponen ANTES de que empiece.**
    `touch-action`, `-webkit-touch-callout` y `user-select` aplicados al entrar
    en modo arrastre llegan tarde: el navegador ya decidió qué hacer con ese
    toque cuando el dedo tocó la pantalla.
42. **El orden de los eventos táctiles en iOS no es determinista; un sello de
    tiempo sí.** Tragar el `click` posterior a un gesto en fase de captura falla
    cuando iOS no dispara ninguno, o lo dispara tras el re-render. Guardar
    cuándo terminó el gesto y consultar la hora funciona siempre.
43. **Un comportamiento correcto al entrar a una pantalla puede ser incorrecto
    al volver a ella.** Abrir la primera tarjeta cuando no hay ninguna abierta
    está bien al empezar la sesión y está mal después de reordenar: abría un
    ejercicio que nadie tocó. Pregúntate siempre desde dónde se llega a ese
    render.
44. **Tres fallos con la misma raíz son una regla que falta, no tres bugs.** El
    scroll de los modales, el arrastre y el `preventDefault` fallaron los tres
    por verificar en escritorio algo que solo se comporta así en iOS. Por eso
    ahora es la regla dura §2.14 y tiene su propio protocolo en §5.5.
45. **Una senoidal pura es la peor forma de onda para un aviso.** Toda su
    energía está en UNA frecuencia, así que cualquier ruido de banda ancha —la
    música y el ambiente de un gimnasio— la tapa entera. Un aviso que tiene que
    oírse en ruido lleva armónicos, ritmo y vive donde el oído es más sensible
    (2–4 kHz). Subirle el volumen a una senoidal grave no la hace audible, solo
    más fuerte.
46. **Normalizar por la suma de las amplitudes no normaliza.** El pico de
    `sin(x) + 0.5·sin(2x) + 0.3·sin(3x)` es 1.42, no 1.8: los armónicos no
    llegan al máximo a la vez. Dividir por 1.8 dejó la alarma ~3 dB por debajo
    de lo que el formato permitía. Si vas a normalizar, MIDE el pico.
47. **Programar algo en un reloj que el sistema para no es programarlo.** El
    beep del descanso se agendaba en el reloj del AudioContext, e iOS suspende
    el AudioContext justo en el único caso donde hacía falta: pantalla
    bloqueada. Antes de apoyarte en un temporizador, pregúntate quién lo mueve y
    si sigue vivo en el escenario que te importa.
48. **Cuando no puedes programar un evento, programa su MEDIO.** Un `<audio>`
    no admite "suena dentro de 90 s", pero sí admite un clip de 90 s de silencio
    con el tono al final. El reloj pasa a ser el del reproductor del sistema, que
    es exactamente el que no se congela.
49. **Un permiso del navegador se le concede a un OBJETO, no a la página.** El
    permiso de reproducir audio en iOS es del elemento `<audio>` concreto que
    sonó dentro de un gesto. Crear uno nuevo por cada descanso lo perdía; hay
    UNO y se le cambia el `src`.
50. **Comprobar un hecho observable gana a deducir un estado.** Para saber si la
    alarma sonó se mira el cabezal del reproductor (¿llegó al segundo del tono?),
    no el estado del AudioContext. Un hecho no tiene casos raros; una deducción
    los tiene todos.
51. **Un comentario que afirma una medida no la garantiza.** `.g-modal-close`
    decía "el área es 44" y medía 32×32: lo que tenía era un `box-shadow` de
    6 px transparente, y una sombra no recibe toques. Si una regla dura del
    diseño se puede medir, mídela — el área táctil real se comprueba con
    `elementFromPoint` en las esquinas, no leyendo el CSS.
52. **"Apagado" tiene que significar apagado.** Con la alarma de fondo
    desactivada, la app tampoco reproduce los 50 ms de silencio que autorizan el
    elemento: son silencio, pero le quitan la sesión de audio a lo que estés
    oyendo. Un interruptor que deja encendida "solo una parte pequeña" es peor
    que no tenerlo, porque el síntoma que provoca ya no tiene explicación.

53. **El parpadeo al cambiar de pantalla casi nunca es falta de animación: es
    el orden.** Si enseñas el panel y luego lo pintas con datos que llegan por
    promesa, el usuario ve el hueco — con fundido lo verá igual, más suave. Se
    pinta oculto y se revela lleno; la animación es el acabado, no el arreglo.
54. **Una transición que solo existe a la entrada se siente peor que ninguna.**
    Los bottom sheets entraban deslizando y desaparecían con un `remove()` seco.
    El cerebro aprende el movimiento de entrada y espera su simétrico; cuando no
    llega, el corte se nota más que si nunca hubiera habido animación.
55. **Una altura desconocida se anima con una rejilla de `0fr` a `1fr`, no
    midiéndola.** Medir con `scrollHeight` en cada apertura devuelve lecturas de
    layout al camino del dedo (lección 38) y hay que re-medir cada vez que el
    contenido cambia. Con la rejilla el navegador hace la cuenta. Trampa: el
    contenido con padding necesita un div que recorte, o el padding sigue
    midiendo con la fila a cero.
56. **Recortar no es ocultar.** `display:none` sacaba lo cerrado del orden de
    foco y de VoiceOver gratis; `overflow:hidden` lo deja ahí, invisible pero
    alcanzable con el teclado y leído por el lector de pantalla. Al cambiar uno
    por otro hay que reponer a mano lo que el primero daba de regalo
    (`visibility`).
57. **Un control que no acusa recibo se siente roto aunque funcione.** No es
    decoración: entre el toque y el resultado hay milisegundos en los que el
    dedo duda y vuelve a tocar. La mitad de los controles de esta app no tenían
    `:active` y esa mitad era justo la que se sentía "brusca".
58. **`prefers-reduced-motion` en el CSS apaga media casa.** Las esperas que
    programa el JS alrededor de una animación siguen ahí, y una espera sin
    animación detrás no es una transición: es la app tardando. Se consulta la
    preferencia también desde el JS (`sinMovimiento()`).

59. **Una animación puede ir a 60 fps y aun así sentirse rough.** La primera
    sospecha ante "no es fluido" es que se caen frames; aquí no se caía casi
    ninguno. Lo que fallaba era el perfil: la curva metía 66 px de salto entre
    dos frames y luego se arrastraba 180 ms avanzando menos de 2 px. Antes de
    optimizar, **mide el incremento por frame**, no solo el tiempo de frame.
60. **La curva de lo que cambia de tamaño no es la de lo que se mueve.** Una
    curva agresiva de salida es carácter en un elemento que se desplaza 18 px y
    un latigazo en uno que crece 254. La distancia decide la curva, no el gusto.

## 8. Pendientes / ideas evaluables

- [ ] Preferencia para display en kg (hoy display fijo lbs; pedirá OK Esteban).
- [ ] Gráfica de volumen por sesión además de peso máx.
- [ ] Aviso de PR en el momento de registrar el set (evaluado 2026-08-12,
      Esteban lo dejó fuera de este lote; el cálculo ya existe en `stats.js`).
- [ ] Series de calentamiento aparte, superseries y RPE (evaluados 2026-08-12,
      pendientes de decisión: los tres añaden un campo más por set).
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
- [ ] Reordenar accesible: el arrastre por pulsación larga no es operable con
      VoiceOver ni teclado (§5.4). Salida: un modo "reordenar" explícito.
- [ ] **Confirmar la alarma de fondo en el iPhone.** §5.6 está verificada en
      Chromium; que el clip siga sonando con la pantalla bloqueada en una PWA de
      iOS solo lo dice el teléfono. Si no suena, la siguiente parada es Web Push
      — y eso exige un servidor, que hoy el proyecto no tiene.
- [ ] **Deshacer un registro no para el descanso.** Si tocas el ✓ por error y lo
      quitas, el temporizador sigue corriendo. No se corrigió porque cancelar
      siempre rompería el caso de corregir un set viejo mientras descansas del
      último; habría que recordar qué set arrancó el descanso.
- [ ] **Exportar en la PWA de iOS.** El backup se baja con un `<a download>`
      sobre un blob; en modo standalone iOS puede ignorarlo sin avisar. Sin un
      iPhone para probarlo no se toca a ciegas.
- [ ] Áreas táctiles por debajo de 44 px que quedan a propósito: el toggle
      lbs/kg (36×38) y las pastillas de filtro (38 de alto) son controles
      segmentados secundarios; el 🗑 de quitar ejercicio mide 37 de ancho y ser
      estrecho ahí protege. Medido el 2026-09-13; si alguna estorba, se sube.

## 9. Historial de cambios estructurales

> Una fila por commit o grupo relacionado. `98d6889` → SHA tras el push.
> Mencionar siempre `sw.js → gymtracker-YYYYMMDD-N` si hubo deploy.

| Fecha | Commits | Cambio |
|-------|---------|--------|
| 2026-09-13 | `(pending)` | **La apertura de las tarjetas, fluida de verdad (§5.8).** Esteban sobre la entrega anterior: *"ya no es de golpe como antes, pero se sigue sintiendo rough, no es fluida"*. **No se caían frames** —medido con la CPU 6× más lenta: mediana de 16.7 ms y UN solo frame largo—, así que optimizar no era el camino. Lo que fallaba era el **perfil del movimiento**: `--ease` (`.32,.72,0,1`) recorre el 86% del camino en el primer 30% del tiempo, o sea que la tarjeta saltaba de 65 a 285 px en 73 ms con **saltos de 66 px entre frames** y luego se arrastraba 180 ms avanzando menos de 2 px por frame. Latigazo y reptar. Comparadas seis curvas frame a frame sobre `devices['iPhone 11']`, gana `.25,.1,.25,1`: **37 px de salto máximo** (vs 66), 34 de p90 (vs 53) y **cero frames de cola** (vs 6). Vive en el token nuevo **`--ease-size`**, con la regla de que `--ease` es para transformaciones y `--ease-size` para lo que cambia de tamaño. Además el contenido **entra con fundido y 6 px de asentamiento** en vez de aparecer destapado por un borde que avanza (con el puro recorte, cada frame el texto vuelve a encajar en la rejilla de píxeles y se lee como un barrido duro); son `opacity` y `transform`, los compone la GPU y no añaden un solo cálculo de layout por frame. Y **`contain: layout paint` en el recorte**, que sí era rendimiento puro: sin él, cambiar la altura obliga a reconsiderar el layout de la página entera en cada frame — con la CPU **10×** más lenta (peor caso que un iPhone 11) los frames por encima de 32 ms bajan de **23 de 94 (24%) a 8 de 106 (7.5%)**, y con 6× quedan en **cero**. Seguro porque el recorte ya lleva `overflow:hidden` y lo único posicionado dentro se ancla a su propio padre `relative`; `contain: size` NO se puede poner, la rejilla necesita medir el contenido para resolver `1fr`. Medido también, y descartado: quitar el `backdrop-filter` de las tarjetas ahorra menos que la contención y cuesta el material entero. Aspecto sin cambios (mismas capturas). Las 45 comprobaciones táctiles de la entrega anterior siguen en verde, arrastre incluido. Lecciones 59-60. 86/86 tests. 0 errores de consola. `sw.js → gymtracker-20260913-3`. |
| 2026-09-13 | `(pending)` | **Transiciones: se acabó el parpadeo al cambiar de pestaña (§5.8).** Esteban: *"hago click y muestra un flash de lo que hay en esa página; nada es smooth"*. **El diagnóstico no era falta de animación, era el ORDEN:** `switchTab` marcaba el panel como visible y DESPUÉS lo pintaba, y pintar es `clear()` más rellenar cuando contesta IndexedDB — el panel entraba en pantalla vacío y el contenido caía encima uno o dos frames más tarde. Medido en Chromium sobre `devices['iPhone 11']` ANTES del cambio: Ejercicios aparecía con **202 px** de alto y saltaba a **2832**, Progresión 435 → 2824, y Entrenar aparecía **vacío**; DESPUÉS los tres son estables desde el primer frame visible (2832 → 2832, 2824 → 2824, 659 → 659). Los tres `render*` devuelven ahora una promesa que resuelve con los datos ya en el DOM, `main.js` pinta el panel oculto y lo revela lleno, y el panel que se va se desvanece antes (120 ms fuera / 200 ms dentro, con 6 px de asentamiento). La pastilla de la pestaña se marca en el mismo tick del toque —el control responde aunque el contenido tarde—, hay tope de espera de 260 ms, y el `scrollTo` suave que animaba la página justo mientras el contenido se reemplazaba pasa a ser un salto instantáneo en el mismo instante del relevo. **Tocar la pestaña activa ya no re-renderiza** (repintaba la pantalla entera por el gesto más inofensivo de la barra): sube al inicio, como en iOS. **El arranque también:** el esqueleto se queda hasta que el primer tab tiene datos en vez de borrarse y dejar un rectángulo negro. **Abrir y cerrar tarjetas de ejercicio se anima** con la rejilla `0fr → 1fr` (nada de medir alturas en JS: lección 38), con `visibility` para no dejar lo cerrado accesible al foco y a VoiceOver, y con colapso INSTANTÁNEO en modo reordenar porque `dragorder.js` mide en el mismo tick (§5.4). **Los sheets se cierran animados** en vez de `overlay.remove()` seco, soltando el scroll del fondo de inmediato. **`:active` en los ~14 controles que no lo tenían.** `sinMovimiento()` en `dom.js` porque `prefers-reduced-motion` en CSS no apaga las esperas que programa el JS. Verificado con eventos táctiles reales (§2.14) en las tres pestañas: 0 frames con panel visible vacío en 5 cambios seguidos, altura estable tras revelarse, cambio en 166-174 ms, dos toques seguidos dejan un solo panel, movimiento reducido sin esperas, y el arrastre intacto (entra en modo, las 5 tarjetas colapsan a 53 px exactos, sigue al dedo, `scrollY` sin moverse, aterriza donde apunta el dedo, no abre nada de más, el toque corto sigue abriendo). Lecciones 53-58. 86/86 tests. 0 errores de consola. `sw.js → gymtracker-20260913-2`. |
| 2026-09-13 | `b638f24` | **Tarjetas que no se abren solas + alarma de descanso que se oye y puede sonar con la pantalla bloqueada.** Dos reportes de Esteban y una auditoría. **(1) Tarjetas (§5.7):** *"que la única razón por la que se abren es cuando YO las toco; es muy molesto salirme o, en un momento aleatorio, que se abra la del primer ejercicio"*. Había DOS auto-aperturas: `createSession` abría el primero del plan autollenado, y `refreshExercises` abría el primero siempre que no hubiera ninguna abierta — y `refreshExercises` corre en CADA vuelta al tab porque `switchTab` re-renderiza siempre, que es de donde salía el "momento aleatorio". Las dos fuera; ahora solo abre una tarjeta el toque en su cabecera (y agregar ese ejercicio a la sesión). **(2) Alarma (§5.6):** eran dos problemas distintos. *Que no se oye:* el beep eran dos **senoidales puras** de 880/1175 Hz a ganancia 0.35 — la peor forma de onda posible en ruido de banda ancha; ahora son seis pulsos (3 + pausa + 3) de **2000 Hz con armónicos**, donde el oído es más sensible y el altavoz del iPhone rinde, y normalizados por el **pico real** de la onda (1.4198 medido, no 1.8 = la suma de amplitudes, que la dejaba 3 dB por debajo). *Que no suena con el teléfono bloqueado:* el mecanismo anterior **no podía** funcionar — programaba el tono en el reloj del AudioContext e iOS suspende el AudioContext justo al bloquear la pantalla. Ahora la alarma va por un elemento `<audio>` al que se le da YA un clip WAV generado en memoria de **silencio del largo del descanso + el tono al final**: el reloj que cuenta pasa a ser el del reproductor del sistema. Tiene un coste real (ocupa el "now playing" y puede pausar tu música), así que es la preferencia **`alarma_fondo`** con interruptor y botón de probar en Progresión → ALARMA DE DESCANSO; apagada, la app no toca el reproductor **ni para autorizar el elemento**. `alarmWasLost()` mira el cabezal del reproductor —un hecho, no una deducción— para sonar al volver si iOS lo mató y NO sonar dos veces si sí sonó. **(3) Auditoría:** `.g-modal-close` decía en un comentario que su área era 44 y medía **32×32** (lo que tenía era un `box-shadow` transparente, y una sombra no recibe toques); el `<input>` de búsqueda medía 21 px de alto dentro de una caja de 44, así que tocar el borde del buscador no enfocaba nada; `.g-tool-btn` (donde vive el 🗑 que quita el ejercicio) medía 40; el `contextmenu` de `dragorder.js` era anónimo y `disable()` no podía quitarlo, así que se acumulaba un listener por render sobre un contenedor que sobrevive a todos; y la tarjeta de sesión activa abría el entrenamiento con **"LEGS / Legs"** — desde que se retiró "Workout #N", `sessionName` devuelve exactamente `routine_type` y la línea de arriba repetía la de abajo. Áreas táctiles medidas con `elementFromPoint`, no leyendo el CSS. Verificado en Chromium sobre `devices['iPhone 11']` con eventos táctiles reales (§2.14): 22 comprobaciones de tarjetas/alarma/preferencia + el arrastre completo (entra en modo, sigue al dedo, `scrollY` sin moverse, aterriza donde apunta el dedo, no abre nada al soltar, el toque corto sigue abriendo) + 0 desbordes horizontales en las 8 pantallas. **Lo que NO está verificado y hay que probar en el iPhone: que el clip siga sonando con la pantalla bloqueada.** 86/86 tests (4 nuevos sobre el WAV generado). 0 errores de consola. `sw.js → gymtracker-20260913-1`. |
| 2026-08-13 | `fd6b2e8` | **El arrastre, arreglado de verdad para iOS + estandarización final.** Esteban: *"funciona el 10% de las veces; a veces se resalta la tarjeta pero es imposible moverla, y en vez de moverse solo scrollea"*. Dos creencias falsas, las dos habituales: **(1)** `preventDefault()` sobre `pointermove` NO cancela el scroll en iOS Safari — solo lo hace sobre **`touchmove`** y solo con `{passive:false}`; sin eso, al mover el dedo iOS scrolleaba y se llevaba el gesto, dejando la tarjeta levantada e inmóvil, exactamente el síntoma descrito. **(2)** `touch-action:none` puesto al ENTRAR en modo arrastre llega tarde: el navegador decide si un toque puede scrollear cuando el toque empieza. Además `MS_LARGA` 420→**320 ms** (la lupa y el menú contextual de iOS salen sobre los 500 y competían con el final de la espera), umbral de cancelación 8→**10 px** (el pulgar tiembla), y `-webkit-touch-callout`/`user-select` **permanentes** en la cabecera en vez de aplicarse al arrastrar. **La tarjeta ya no se abre sola al reordenar**: tragar el click en fase de captura no basta —iOS a veces no dispara ninguno y a veces lo dispara tras el re-render— así que la cabecera ignora los clicks de los 400 ms posteriores a un arrastre, y `refreshExercises` deja de auto-abrir la primera tarjeta cuando el render viene de reordenar. Verificado con **eventos táctiles reales** (`Input.dispatchTouchEvent` sobre `devices['iPhone 11']`): **5/5 arrastres correctos**, `scrollY` sin moverse durante el gesto, y sin romper lo de siempre — deslizar rápido scrollea, el toque corto abre la tarjeta y los botones de dentro responden. **Estandarización:** nueva regla dura §2.14 (nada táctil se verifica con el ratón), nueva §5.5 con las cuatro reglas de gestos en iOS y el protocolo de verificación, y lecciones 39-44. 82/82 tests. `sw.js → gymtracker-20260813-1`. |
| 2026-08-12 | `8d92fa1` | **Red de seguridad del arranque, pantalla de inicio y fuera "Workout #N".** Esteban reportó la PWA congelada en el esqueleto de arranque, sin poder tocar nada ni cerrando desde el multitarea. La causa es siempre la misma familia: si `js/main.js` o cualquiera de sus imports no carga (un archivo que no quedó en la caché del SW, un fallo de red en frío), el módulo no se ejecuta, `boot()` nunca corre y el esqueleto late para siempre — la app parece viva y no responde, y la única salida era desinstalar. Ahora `index.html` lleva un **script clásico (NO módulo)** que a los 8 s comprueba si el esqueleto sigue ahí y, si sigue, ofrece **Reintentar** y **Reparar y recargar** (borra cachés + desregistra el SW; IndexedDB no se toca). Un módulo no sirve para esto: si los módulos son el problema, el vigilante tiene que estar fuera de ellos. **Pantalla de inicio:** era ~70% negro vacío; ahora abre con una tarjeta de **últimos 7 días** (sesiones, volumen, sets + tira de actividad de 7 puntos) y muestra 5 sesiones recientes en vez de 3. `stats.js › weekSummary`, con tests. **Fuera "Workout #N":** numeración heredada del template de Notion que no dice nada que la fecha no diga mejor. `stats.js › sessionName` lo deriva de `routine_type`, así que el historial ANTIGUO también pierde el prefijo **sin tocar un solo registro**; se retiran `nextWorkoutNumber` y la escritura de `contador_workouts` (la clave sigue en la lista blanca del importador para que un backup viejo entre sin avisos). 82/82 tests. 0 errores de consola. `sw.js → gymtracker-20260812-6`. |
| 2026-08-12 | `e9f57f6` | **Arrastre fluido + tarjetas compactas.** Esteban aprobó los tres riesgos del PR con un matiz: que el arrastre fuera totalmente fluido, y sugirió tarjetas lo más pequeñas posible. Resultan ser el mismo problema. **Al entrar en modo reordenar todas las tarjetas colapsan al nombre** (§5.4): la lista pasa de 610 px a **368 px** y cabe entera en pantalla, todas miden lo mismo y el cálculo de huecos se vuelve exacto — arrastrar una tarjeta abierta de 315 px tapaba media pantalla y dejaba un hueco que nunca coincidía. Requirió repetir `.open` en el selector: `.g-ex-card.open .g-ex-body` ganaba por especificidad y la tarjeta abierta seguía sin colapsar. **Fluidez:** el `gap` se lee una vez en vez de un `getComputedStyle` por `pointermove` (la causa principal de tirones), el pintado va dentro de `requestAnimationFrame`, `will-change: transform` para que el navegador no repinte la lista entera por frame, y un ancla que centra la tarjeta bajo el dedo tras colapsar. Medido: **61 fps** durante el arrastre y **0 px** de desfase entre el centro de la tarjeta y el dedo. **Fuera del modo reordenar**, la tarjeta colapsada muestra solo nombre y contador: la línea de músculos se partía en dos y descuadraba la lista. Toast a 0.88 de opacidad — era el único vidrio que aparece sobre texto denso y se leía turbio. **Bug encontrado al verificar:** `pointermove`/`pointerup` colgaban del contenedor, así que si el dedo salía de la lista antes de vencer la pulsación larga (hacia el cronómetro) la cancelación no llegaba y el arrastre arrancaba igual; ahora van en `window`. Cinco casos límite verificados: salir de la lista, scroll corto, mantener quieto, soltar fuera y toque corto. 76/76 tests. 0 errores de consola. `sw.js → gymtracker-20260812-5`. |
| 2026-08-12 | `0df7aa0` | **Taxonomía de músculos, arrastre para reordenar y flujo de inicio.** **Músculos (§5.3):** Esteban reportó "músculos raros y duplicados"; la auditoría encontró que el defecto no estaba en sus datos sino en el selector — la constante decía `Aductores` y sus datos `Aductor`, y como el selector añadía además los músculos descubiertos en la base, mostraba los dos a la vez. Peor: `Espalda` y `Dorsales` eran marcables a la vez, así que el volumen por músculo contaba **el mismo set dos veces**. Lista definitiva de **18 músculos** en `js/muscles.js`, un solo nivel de granularidad, agrupada por patrón de movimiento; el selector pasa a ser **lista cerrada** (sin buscador ni "Crear «X»", que es lo que dejó nacer los duplicados). Migración del historial **ofrecida con el diff a la vista** (17 ejercicios), con la regla de traducir y no inventar: `Espalda` en un remo sí significa dorsales y trapecios, pero añadirle bíceps habría triplicado ese volumen sin motivo. 14 tests, incluido uno sobre los 36 ejercicios reales que exige que nadie quede sin músculos ni con nombres fuera de la taxonomía. **Editar músculos DURANTE la rutina** desde la tarjeta del ejercicio. **Reordenar (§5.4):** los ↑ / ↓ los sustituye pulsación larga + arrastre estilo homescreen de iOS (`js/ui/dragorder.js`). **Inicio:** un solo campo que busca entre tus días y, si lo que escribes no existe, ofrece crearlo vacío. Verificado en Chromium: migración aplicada, selector de 18 en 4 grupos, filtrado de días, creación de día nuevo, arrastre que aterriza donde apunta el dedo (con una card abierta entre cerradas) y scroll que NO arrastra. 0 errores de consola. 76/76 tests. `sw.js → gymtracker-20260812-4`. |
| 2026-08-12 | `5a5577d` | **Modelo propuesto/registrado + autollenado del día.** Esteban pidió quitar los chips `Hecho / Pendiente / Saltado` ("herencia de un template de Notion obsoleto") y que la app **suponga que repetirá el mismo día**: al empezar "Upper A" se proponen los ejercicios y sets de la última sesión con ese nombre, él modifica durante el entrenamiento, y lo que registre se vuelve el molde de la próxima. **El template ES la sesión anterior** — no hay entidad nueva, ni CRUD de plantillas (§5.2 explica por qué eso sería justo lo que rechazó). Los chips se sustituyen por un **botón dedicado de registro por fila** (decisión suya: tocar la fila entera era un blanco demasiado grande para el pulgar y un registro accidental contamina PRs en silencio); un set propuesto se ve apagado y no cuenta para nada. Editar un set NO lo registra. El **verde desapareció de la app entera**: solo queda el rojo destructivo. La rutina se **elige de una lista** en vez de escribirse, porque "Upper A" y "Upper A " partirían el día en dos. El sheet de finalizar ahora **nombra los ejercicios sin ningún set registrado**, que al no guardarse tampoco entrarán en la propuesta de la próxima vez — sin ese aviso el plan se encogería solo y semanas después. `stats.js › autofillPlan` con 10 tests. Cero cambios de schema: un propuesto es un `Pending` con peso y reps reales, e `isCountable`/`isPlaceholder`/el borrado al finalizar ya hacían lo correcto. Verificado en Chromium el ciclo entero con el seed real: autollenado de 6 ejercicios/13 sets, registro y deshacer, avisos al finalizar, y la sesión siguiente proponiendo solo lo registrado. 0 errores de consola. 61/61 tests. `sw.js → gymtracker-20260812-3`. |
| 2026-08-12 | `f43bf76` | **Rediseño "Vidrio Negro" + 3 funciones.** Esteban pidió una estética más limpia con negros y grises transparentes tipo Liquid Glass; eligió **acento platino `#EDEDF0`** sobre el naranja heredado tras ver las dos opciones maquetadas. `styles.css` reescrito sobre cuatro niveles de vidrio (blanco 4.5/7/10.5% + chrome `#101012` al 72%), rampa de texto de 4 niveles y halos radiales en `body::before` — **sin ellos el `backdrop-filter` no tiene qué muestrear y todo el vidrio se degrada a gris**. Reglas completas en §5.1. **Barra de pestañas movida ABAJO** y flotante: era navegación principal fuera del alcance del pulgar en un iPhone 11. Áreas táctiles de 44 px en todo (la "×" de borrar set medía 26, el cerrar de modales 28). Soporte de `prefers-reduced-transparency`, `prefers-contrast` y `prefers-reduced-motion`. Colores del SVG movidos de `setAttribute` en JS a clases CSS. **Funciones nuevas:** (1) **set fantasma** — el peso y las reps de la sesión anterior aparecen como placeholder y confirmar sin teclear los registra, el atajo que más tiempo ahorra según Hevy; (2) **calculadora de discos** (`js/plates.js`, módulo puro, 12 tests) con el peso de barra persistido en `bar_lbs`; (3) **sets por músculo de la semana** en Progresión, aprovechando los `musculos` que ya se guardaban y no se usaban. `suggestNextSet` y `setsPerMuscle` en `stats.js` con tests. `bar_lbs` añadida a `PREFS_IMPORTABLES` + test que exige que la lista blanca cubra toda clave que la app escriba. Verificado en Chromium con el seed real: fantasma que avanza set a set y se reexpresa en kg, registro de un toque, discos 185→45+25, caso no alcanzable, tarjeta de músculos y los 3 tabs. 0 errores de consola. 51/51 tests. `sw.js → gymtracker-20260812-2`. |
| 2026-08-12 | `009d0ae` | **Revisión maestra #3: 10 defectos.** **Actualizaciones (crítico):** `controllerchange` seguía leyendo el `hadController` congelado del arranque — la mitad de la lección #18 que no se arregló. Una pestaña abierta desde la primera instalación aplicaba la versión nueva pero NUNCA recargaba: seguía corriendo el JS viejo en memoria, sin banner y sin síntoma visible. Ahora el flag se marca cuando aparece el primer controller. Además `forceUpdateCheck()` esperaba a `reg.waiting` cuando el worker podía estar aún en `installing`, y contestaba "Ya tienes la última versión" — mentira dicha justo en la pantalla de diagnóstico; ahora espera a que termine de instalar (timeout 10 s). **iOS:** el bloqueo de scroll del fondo con un sheet abierto nunca funcionó en iPhone (`body{overflow:hidden}` no hace nada en iOS Safari; se validó en Chrome de escritorio); ahora `position:fixed` + restauración de `scrollY`. **Sesión activa:** agregar un ejercicio que YA estaba en la sesión creaba un placeholder duplicado y lo mandaba al final del orden; ahora avisa y solo abre su card. Borrar un set (el "×" está pegado al chip de estado) es irreversible de un toque → toast con **Deshacer** de 6 s. **Enter** encadena peso → reps → guardar sin soltar el teclado. **Rendimiento:** `boot()` pintaba los TRES tabs (9 lecturas completas de IndexedDB antes de ver nada, encima del arranque en frío); ahora solo el visible. Cada card de ejercicio hacía su propio `dbGetAll('sesiones')` completo (8 ejercicios = 8 barridos de la tabla); ahora se carga una vez en `refreshExercises`. El tab Ejercicios pedía `ejercicios` y `sesiones` por duplicado (5 lecturas donde bastan 3). **Otros:** Progresión ocultaba la sección de cardio si no había ningún ejercicio; `switchTab` renderizaba sin try/catch; `index.html` sin `mobile-web-app-capable`. Verificado end-to-end en Chromium con el seed real: restauración, sesión completa, re-agregar ejercicio, Enter, deshacer, scroll lock, finalización y los 3 tabs. 0 errores de consola. 30/30 tests. `sw.js → gymtracker-20260812-1`. |
| 2026-08-03 | `a40b727` | **Banner de actualización visible + 2 bugs del mecanismo.** Esteban confirmó que el banner llegó (días después) y pidió que fuera más grande: era una píldora gris de 13px encima del título, "casi imperceptible". Ahora es una tarjeta naranja de ancho completo, 16px bold, botón negro con área táctil de 44px y animación de entrada; el contenido baja mientras está visible para no quedar tapado. **Dos bugs reales cazados probándolo:** (1) el botón guardaba el `ServiceWorker` capturado al pintar el banner — si llegaba otro worker después, el capturado quedaba `redundant` y el `postMessage` no hacía nada (el botón se pulsaba y no pasaba nada); ahora lee `_reg.waiting` en el momento del clic, con recarga de respaldo a los 6 s. (2) `hadController` se congelaba al arrancar, así que una pestaña abierta desde la primera instalación nunca volvía a detectar actualizaciones; ahora se consulta el controller en el momento de decidir. Verificado en Chrome el ciclo limpio completo. 30/30 tests. `sw.js → gymtracker-20260803-1`. |
| 2026-08-02 | `bd45cc5` | **Actualizaciones: el banner nunca salió en el iPhone.** Esteban abrió la PWA tras el deploy anterior y no vio el aviso ni cerrándola del multitarea varias veces. Causa: `registerSW()` solo enganchaba `updatefound`, pero cuando `register()` resuelve el navegador **ya puede haber instalado** la versión nueva — el evento ya se disparó y el worker se queda en `waiting` invisible para siempre. Ahora se miran los tres estados (`waiting`, `installing`, `updatefound`). Además: **auto-activación** si no hay sesión de gym a medias (no depender de que vea un banner; entrenando sí pregunta), **versión visible** en Progresión → DATOS contrastando `APP_VERSION` con la constante `CACHE` que el SW responde por `postMessage`, y botón **"Buscar actualización"** manual como salida de emergencia. Lógica movida a `js/swupdate.js` (evita el import circular con Progresión). Verificado en Chrome los 4 caminos: banner sin recargar, banner que vuelve tras recargar, auto-actualización silenciosa sin sesión activa, y banner (sin recarga) con sesión a medias. 30/30 tests. `sw.js → gymtracker-20260802-2`. |
| 2026-08-02 | `ad9d827` | **Revisión maestra #2: 20 defectos corregidos.** Auditoría línea por línea de los 22 archivos. **Datos:** el backup v3 perdía `preferencias` (descanso global, contador de workouts) y `ts` de sets/cardio en cada restauración — el test "conserva todo" no los verificaba; ahora sí (30 tests). `dbBulkImport` acepta `preferencias` con lista blanca de claves. **Robustez:** `db.onclose` + `withDB()` reabren la conexión IndexedDB si iOS la mata (antes la app quedaba inservible hasta reabrirla); `boot()` aísla el render de cada tab; `sw.js` ya no aborta la instalación entera por un 404. **Actualizaciones (requisito de Esteban):** `updateViaCache:'none'`, banner desde `reg.waiting` al arrancar (antes una actualización ignorada se perdía para siempre), `reg.update()` al abrir y al volver del background, y fin de la recarga espuria del primer arranque. **Arranque:** 5 splashes `apple-touch-startup-image` + shell estático en `index.html` (ver §Arranque). **UX:** barra de descanso `sticky`; edición de sets ya guardados (peso/reps/unidad); descanso por ejercicio y `rest_default` global editables desde el tab Ejercicios; renombrar/cambiar rutina de un ejercicio; scroll del fondo bloqueado con el sheet abierto; `once()` contra el doble toque (dos sesiones de un tirón). **Correcciones:** PR del directorio contaba sesiones sin finalizar; cronómetro seguía latiendo al cambiar de tab; Wake Locks huérfanos; carrera en `orden` de sets; `fmtDate*` corría un día con fechas sin hora; mensaje de error engañoso al crear ejercicio; buscador de Ejercicios con debounce y una sola carga (antes 2 `dbGetAll` por tecla); Progresión indexa sets por ejercicio. Verificado en Chrome: restauración del seed, sesión completa, edición de set, descanso 150s, finalización, Progresión, export/import y el ciclo de actualización end-to-end. 0 errores de consola. 30/30 tests. `sw.js → gymtracker-20260802-1`. |
| 2026-07-29 | `5b8b9c1` | **Fix contador + smoke test integral.** `nextWorkoutNumber()` en `stats.js` (+ test): el número de workout ahora toma el máximo entre el contador persistente y el mayor "Workout #N" del historial — tras importar el seed, la primera sesión nueva salía "Workout #1" duplicando nombres históricos; ahora sale #36. Verificado en navegador real (Chrome, servidor local): restauración del seed, los 3 tabs, sesión completa (ejercicio, copiar última sesión, chips, rest timer, finalizar con limpieza de pendientes), cardio, config de descanso por ejercicio, modal de reanudación, eliminación cascade, y el banner de actualización del SW end-to-end. 0 errores de consola. 27/27 tests. `sw.js → gymtracker-20260729-1`. |
| 2026-07-28 | `a6e85ac` | **Génesis.** App completa creada desde cero tras revisión maestra de habitos-app (35 sesiones/578 sets migrados vía `data/seed.json`). Arquitectura ES modules, 26 tests Node, importador v2/v3 (rescata 167 sets legacy `peso_lbs`), rest timer por timestamp + beep Web Audio + Wake Lock, render quirúrgico, cardio, PR peso/reps, reordenar ejercicios, copiar última sesión, descanso por ejercicio, banner de update del SW, CI GitHub Actions. `sw.js → gymtracker-20260728-1`. |
