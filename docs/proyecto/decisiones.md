# Registro de decisiones

Formato: fecha, decisión, por qué, lo descartado. Léelo antes de proponer cambiar la arquitectura o una función: aquí está lo que ya se evaluó. Una decisión nueva va al final.

## 2026-07-28 · Nace gym-tracker, separado de habitos-app
- **Por qué:** una revisión maestra de habitos-app encontró ~17 bugs y deudas. Se reescribió desde cero solo para el gimnasio y se migraron 35 sesiones y 578 sets con `data/seed.json`.
- **habitos-app** sigue viva y congelada: no se toca.
- **Mental/hábitos:** fuera del alcance para siempre. Esto es SOLO gym.

## 2026-07-28 · Stack: HTML + CSS + JS vanilla con ES modules, sin dependencias
- **Por qué:** una app de un solo usuario y ~6.000 líneas no necesita compilación. Sin npm (el `package.json` existe solo para `node --test` y `"type": "module"`), sin frameworks, sin bundlers, sin CDN, sin `<script src>` remoto.
- **Fuentes:** sin fuentes *remotas*. Desde 2026-09-26 hay una fuente local (ver abajo).
- **Herramientas de verificación** (Playwright, graphify) no son dependencias: están instaladas en el entorno, no en `package.json`.
- **Revisar si:** se aprueba un servidor (ver `progreso.md`, "Lo que sigue").

## 2026-07-28 · Unidades: guardar en kg, mostrar en lbs, teclear en ambas
- **Por qué:** su gimnasio mezcla equipos en kg y lbs. El toggle recuerda la última unidad usada por ejercicio (`unidad` en el set). Guardar en una sola unidad evita que el histórico sea una mezcla (ya pasó: lección 5).
- **Pendiente:** preferencia de mostrar en kg (pedirá OK de Esteban).

## 2026-07-28 · Descanso: 90 s por defecto, configurable por ejercicio o por sesión
- **Widgets y Live Activities descartados:** imposibles en una PWA de iOS. No se prometen.

## 2026-07-28 · Solo sets `Done` cuentan para PR, volumen y gráficas
- **Por qué:** en habitos-app los `Skipped` contaminaron los PR durante meses. Peso 0 con reps es válido (peso corporal).

## 2026-08-02 · Actualización automática, nunca reinstalar
- **Por qué:** borrar la PWA borra IndexedDB, o sea todo el historial. Seis piezas en `js/swupdate.js` (ver `rutas/arranque-y-actualizaciones.md`) + versión visible y botón manual como salida de emergencia.
- **Auto-activación** si no hay sesión de gym a medias; con sesión a medias se pregunta (recargar a mitad de una serie es peor que esperar).

## 2026-08-12 · Autollenado desde la última sesión, NO plantillas
- **Decisión:** al empezar "Upper A" se proponen los ejercicios y sets de la última sesión finalizada llamada "Upper A". Lo que registre se vuelve el molde de la próxima. **El template ES la sesión anterior.**
- **Descartado:** un CRUD de plantillas. Esteban no quiere nada que crear, nombrar, editar ni mantener. No lo construyas.
- **Reemplaza** la decisión original del 2026-07-28 ("sin plantillas, armar cada sesión a mano").

## 2026-08-12 · Registrar es un botón dedicado por fila; sin chips de estado
- **Por qué:** Esteban: *"el verde de 'hecho' me parece innecesario… es una función heredada de un template de Notion obsoleto"*. Los chips se quitaron, pero la distinción propuesto (`Pending`) / registrado (`Done`) se conserva: sin ella, abrir la app crearía PRs ficticios.
- **Botón y no tocar la fila:** decisión explícita suya, *"más seguro y previene accidentes"*. Editar un set NO lo registra.
- **Descartado:** "toca la fila para registrar" por elegancia.

## 2026-08-12 · Taxonomía cerrada de 18 músculos
- **Por qué:** el selector abierto dejó nacer duplicados (`Aductor`/`Aductores`) y mezclar región y parte contaba sets dos veces. Un nivel de granularidad; se separa un músculo solo si cambia una decisión de entrenamiento. Detalle en `rutas/ejercicios-y-musculos.md`.
- **La migración del historial se ofrece, no se aplica sola.**

## 2026-08-12 · Reordenar con pulsación larga + arrastre
- **Por qué:** los botones ↑/↓ convertían reordenar seis ejercicios en quince toques.
- **Coste aceptado:** no es operable con VoiceOver ni teclado. Si algún día importa, la salida es un modo "reordenar" explícito, no devolver los botones.

## 2026-08-12 · Estética "Vidrio Negro" (reemplazada el 2026-09-26)
- Negro real, material Liquid Glass y acento platino `#EDEDF0`; Esteban eligió platino sobre el naranja heredado. Ver la entrada del 2026-09-26.

## 2026-08-12 · Registro mensual en el vault de Obsidian
- Export mensual → un agente lo vuelca a `20 Areas/Salud/Gym/` del vault Ideaverse según `90 Sistema/Formato Registro Gym.md`. Revisar ese documento antes de tocar el formato del export.

## 2026-08-12 · Ícono
- Su imagen de mancuerna cartoon, sin distorsión, fondo blanco. **No regenerar** iconos ni splashes sin que él lo pida.

## 2026-09-13 · Alarma de descanso por `<audio>` con clip generado, apagable
- **Por qué:** iOS suspende el AudioContext con la pantalla bloqueada; la reproducción de un `<audio>` es lo único que sigue. Cuesta ocupar el reproductor del sistema (puede pausar su música), por eso es la preferencia `alarma_fondo`. Best-effort, no garantizado. Detalle en `rutas/descanso-y-alarma.md`.

## 2026-09-13 · Las tarjetas de ejercicio solo se abren cuando él las toca
- **Por qué:** Esteban: *"es muy molesto… en un momento aleatorio se abre la del primer ejercicio y me desconcentra"*. No devolver ninguna auto-apertura "por comodidad".

## 2026-09-26 · Tema crema/Everforest, sin vidrio, letra Atkinson Hyperlegible Next
- **Decisión:** el mismo sistema de diseño que Plata (su app de finanzas): claro crema con acentos naranjas, oscuro Everforest (github.com/sainnhe/everforest), según el modo del iPhone. Superficies sólidas: se retira el material de vidrio.
- **Por qué:** Esteban tiene astigmatismo. La letra está diseñada para baja visión, y el desenfoque detrás del texto le resta nitidez. Un solo sistema de diseño en sus dos apps.
- **Letra:** archivo local en `fonts/` (licencia OFL), copiado de Plata. No se usa Google Fonts: sería un servicio externo y fallaría sin señal en el gimnasio.
- **Reemplaza** "Vidrio Negro" (2026-08-12). El naranja deja de ser una regresión: vuelve como acento, con la regla de una sola acción principal por pantalla.
- **Se conservan:** sin verde de "hecho", rojo solo para lo destructivo, 44 px de área táctil, campos a 16 px o más, todo el sistema de movimiento.

## 2026-09-26 · Documentación en forma de índice y rutas + graphify
- **Por qué:** el README había crecido a 1.070 líneas (~40.000 tokens) de lectura obligatoria para cualquier tarea. Ahora `CLAUDE.md` es corto, `docs/00-INDICE.md` dice qué ruta leer según la tarea, y graphify (`graphify-out/`) permite ubicar funciones sin abrir archivos. Mismo esquema que Plata.
- **Historial:** pasa a `proyecto/historial.md`; se elimina el segundo commit "registra sha en changelog" de cada entrega (el SHA ya está en `git log`).

## 2026-09-26 · Regla dorada: una sola forma de hacer cada cosa
- **Por qué:** Esteban no revisa código; la única defensa contra que la app se vuelva un revoltijo con cada agente o modelo nuevo es una estructura fija. Está en CLAUDE.md §0 y `docs/convenciones.md`.

## 2026-09-26 · Merge automático por defecto
- **Por qué:** Esteban no quiere gastar un mensaje (y los tokens de releer la conversación) en decir "sí, haz merge". Los agentes unen su rama a `main` cuando las verificaciones pasan. Excepciones en CLAUDE.md §5.

## 2026-10-02 · Reglas de Apple (HIG), compartidas con Plata
- **Por qué:** Esteban instaló la skill [apple-design-skill](https://github.com/NutshellEngineering/apple-design-skill) (copia de las Human Interface Guidelines) y pidió revisar sus dos apps con ella y estandarizar. Las reglas exigibles quedaron en `docs/diseno-ios.md`, **idéntico** en `finanzas-ia` y aquí: un solo sistema visual.
- **Letra:** Atkinson se queda (astigmatismo), pero sigue el tamaño de texto del iPhone (Dynamic Type). Descartado: SF Pro, y los tamaños fijos (Apple los considera falla de accesibilidad).
- **Volver** es un símbolo sin texto (antes "‹ Ejercicios"): Apple pide no rotular Atrás/Cerrar. **Deshacer** ya no tiene reloj.
- **Para después:** volver deslizando desde el borde.
- **La skill** (2,5 MB) vive en la cuenta de Claude de Esteban, no en el repo.

## 2026-10-02 · Hoja de Ajustes y Apariencia elegible
- **Por qué:** Esteban: la alarma de descanso, exportar/importar y la versión "no pegan" al final de Progresión. Ahora viven en una hoja de Ajustes que abre el botón ⚙︎ junto al título (como el engranaje de Plata), con Apariencia y el descanso por defecto.
- **Engranaje y no cuarta pestaña:** Apple reserva la barra de pestañas para secciones principales ("Use a tab bar to support navigation, not to provide actions") y cuatro pestañas aprietan el texto grande. Lo eligió Esteban.
- **Apariencia en localStorage, no en IndexedDB:** hay que saber el modo antes del primer frame (script clásico en el `<head>`), e IndexedDB contesta tarde. Perderla no hace daño: vuelve a Automático. Por eso tampoco va en `PREFS_IMPORTABLES`. Mismo mecanismo que Plata (`js/theme.js` es su copia).
- **Excepción a Apple** ("Avoid offering an app-specific appearance setting"): anotada en `docs/diseno-ios.md`, igual que en Plata.
- **Descanso por defecto** queda en dos lugares (Ajustes y la hoja de descanso de cada ejercicio) porque ambos son naturales: la misma preferencia `rest_default` y los mismos límites.

## 2026-10-04 · El autollenado propone ejercicios, no sets
- **Por qué:** al abrir una tarjeta se veían dos "últimas veces" distintas: los sets propuestos (último *día* igual, p. ej. 60 lbs) y la subtarjeta **Última sesión** (última vez del *ejercicio*, 33.1 lbs). Esteban: la referencia es siempre la última vez del ejercicio, sin importar el día.
- **Qué quedó:** `createSession` sigue usando `autofillPlan` para la lista y el orden de ejercicios, con un ancla oculta por ejercicio; los sets solo aparecen con **Copiar estos sets** o al teclearlos. El contador de la tarjeta cuenta solo registrados.
- **Compatibilidad:** los propuestos de una sesión abierta antes del cambio se ocultan (`isAutofillLeftover`: Pending con orden y `ts` igual al inicio de la sesión); se descartan al finalizar como todo Pending.
- **Descartado:** borrarlos al abrir la app (escritura sobre datos sin que él la pida).
