# Ruta: arranque y actualizaciones automáticas

## Qué es
Cómo arranca la PWA en frío en el iPhone sin pantalla negra, y cómo recibe versiones nuevas **sin que Esteban tenga que borrarla y reinstalarla nunca** (requisito duro: borrarla borra sus datos, ver [datos-y-respaldos.md](datos-y-respaldos.md)).

## Archivos y funciones
| Dónde | Qué |
|---|---|
| `index.html` | Shell estático (título, pestañas, esqueleto) + **vigilante de arranque** (script clásico, no módulo) con Reintentar / Reparar y recargar |
| `js/main.js` | `boot` (pinta solo la pestaña visible, cada una en su try/catch), `paintTab`, `switchTab`, `TABS` |
| `js/swupdate.js` | `APP_VERSION`, `registerSW`, `checkForUpdate`, `onNewVersionReady`, `swVersion`, `forceUpdateCheck`, `showUpdateBanner` |
| `sw.js` | `CACHE` (versión), `ASSETS`, `CORE` atómico, responde `VERSION` y `SKIP_WAITING` |
| `icons/splash-*.png` | 5 splashes `apple-touch-startup-image` (incluido el 828×1792 del iPhone 11) |

## Arranque (por qué index.html NO está vacío)

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

## Actualizaciones automáticas (nunca hay que reinstalar la PWA)

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
6. **Versión visible + botón manual** en Ajustes → VERSIÓN (⚙︎ junto al título). `APP_VERSION`
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

## Reglas
- **En cada publicación**: `CACHE` en `sw.js` y `APP_VERSION` en `js/swupdate.js` con el MISMO valor `YYYYMMDD-N`. Archivo nuevo → a `ASSETS`. Olvidar `CACHE` = la PWA sirve código viejo; olvidar `APP_VERSION` = la pantalla de versión marca ⚠️ sin motivo.
- Nunca le pidas a Esteban borrar la app o "limpiar caché". Si la app no se actualiza: ⚙︎ Ajustes → **Buscar actualización**; si está trabada en el esqueleto, el vigilante ofrece **Reparar y recargar** (borra cachés y el service worker, **no** toca IndexedDB).
- Si un patrón defectuoso aparece en una pieza del mecanismo, búscalo en TODAS (lección 19).

## Cómo probar
Los cuatro caminos, en navegador con servidor local: (a) subir `CACHE` → banner sin recargar; (b) recargar sin aceptar → el banner vuelve; (c) sin sesión activa → se actualiza sola, sin banner, caché vieja borrada; (d) con sesión de gym a medias → NO recarga, muestra el banner. Datos intactos en los cuatro.

## Lecciones que aplican
13, 16, 17, 18, 19, 21, 22, 39.

## graphify
`graphify explain "registerSW"` · `graphify explain "forceUpdateCheck"` · `graphify explain "boot"`
