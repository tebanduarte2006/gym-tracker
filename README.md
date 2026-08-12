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

## 3. Arquitectura

```
index.html            Shell ESTÁTICO (título + tabs + esqueleto) + <script type="module">.
styles.css            Design tokens "Vidrio Negro" (Liquid Glass) + clases g-*. Ver §5.1 antes de tocarlo.
manifest.json         PWA (es-CO, standalone, iconos 192/512/maskable).
sw.js                 Service worker: cache-first versionado; responde 'VERSION' y 'SKIP_WAITING'.
js/
  main.js             Bootstrap: tabs, oferta de seed.
  swupdate.js         Registro del SW, detección/aplicación de versiones, APP_VERSION.
  db.js               IndexedDB: UNA conexión cacheada, índices usados de verdad, bulk import transaccional.
  dom.js              el() / clear() / toast() / guard().
  format.js           [PURO] unidades kg↔lbs, fechas es-CO, duraciones, normalización.
  stats.js            [PURO] isCountable/isPlaceholder, PR peso/reps, Epley, volumen, filas por sesión, set fantasma, sets por músculo, autollenado.
  plates.js           [PURO] calculadora de discos por lado (en libras; display, no almacenamiento).
  muscles.js          [PURO] taxonomía de 18 músculos + migración del etiquetado viejo. Ver §5.3.
  importer.js         [PURO] normaliza backups v2 (habitos-app, con toda su deuda) y v3 (nativo).
  audio.js            Beep Web Audio (iOS no soporta navigator.vibrate).
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

## 9. Historial de cambios estructurales

> Una fila por commit o grupo relacionado. `(pending)` → SHA tras el push.
> Mencionar siempre `sw.js → gymtracker-YYYYMMDD-N` si hubo deploy.

| Fecha | Commits | Cambio |
|-------|---------|--------|
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
