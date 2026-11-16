# Ruta: ejercicios y taxonomía de músculos

## Qué es
La pestaña Ejercicios: arriba un control segmentado **Plantillas | Ejercicios**. Plantillas = una plantilla fija por rutina (crear, editar, reordenar, borrar). Ejercicios = el directorio agrupado por grupo muscular, crear, la ficha (nombre, músculos, descanso, en qué plantillas está). Y la lista cerrada de 18 músculos con la que se etiqueta cada ejercicio.

## Archivos y funciones
| Dónde | Qué |
|---|---|
| `js/ui/ejercicios.js` | `renderEjercicios` (devuelve promesa; control segmentado, `_vista`), `renderDirectory`, `renderList` (agrupa con `exerciseGroup`), `renderDetail` (lista estilo Ajustes), `openRenameModal` (solo nombre), `openRestModal`, `buildMusclePicker`, `showNewExerciseModal`, `openEditMusclesModal` (también desde la tarjeta durante la rutina), `pickExercise` (el ÚNICO buscador de ejercicios: sesión y plantillas) |
| `js/ui/plantillas.js` | `renderTemplatesView` (lista), `openTemplateEditor` (copia de trabajo; nada se guarda hasta **Guardar plantilla**; reordenar con `enableDragOrder`) |
| `js/templates.js` [puro] | `TEMPLATES_PREF`, `sanitizeTemplates`, `findTemplate`, `saveTemplate` (una por rutina, por `normalizeKey`), `deleteTemplate`, `templateExerciseIds`, `templatesWithExercise`, `skippedStreak` |
| `js/muscles.js` [puro] | `MUSCLE_GROUPS`, `MUSCLES`, `canonicalMuscle`, `canonicalizeExercise`, `planMuscleMigration`, `needsMuscleMigration`, `isVagueRegion`, tabla `POR_EJERCICIO` (de una sola vez), `exerciseGroup`, `planMuscleReview` + tabla `REVISION_2026_11` (de una sola vez) |
| `js/main.js` | `maybeOfferMuscleMigration` y después `maybeOfferMuscleReview` (se ofrecen con el antes/después, nunca se aplican solas) |

## Plantillas (2026-11-16)
- Una por rutina; la clave es `normalizeKey(nombre)`. `saveTemplate` rechaza un nombre que ya tiene otra plantilla, también al renombrar.
- Guardadas en la preferencia `plantillas` (`[{ nombre, ejercicios: [ids] }]`), en `PREFS_IMPORTABLES`. Pesos y sets NO van ahí.
- Se editan **solo** en esta pestaña. La caneca de la sesión no las toca. `createSession` (entrenar.js) las lee; ver `rutas/entrenar.md`.
- Al crear, las rutinas ya hechas sin plantilla se ofrecen como fichas para no teclear el nombre (lección 30).
- Un ejercicio borrado del directorio se ignora al cargar la plantilla (`templateExerciseIds`).

## Directorio por grupo muscular (2026-11-16)
`exerciseGroup(musculos)`: gana el grupo con más músculos; empate → el primero de `MUSCLE_GROUPS`. La etiqueta vieja `tipo` ya no se muestra ni se edita (estaba mal en muchos ejercicios). Sigue en los datos y `attachExercise` la escribe para ordenar el buscador de la sesión.

## Revisión de noviembre de 2026
Criterio único aprobado por Esteban: principal + ayudantes grandes; fuera los que casi no trabajan. 17 cambios y 2 borrados (0 sets). Se ofrece una vez (`revision_musculos_2026_11`). Detalle en `decisiones.md`.

## Taxonomía de músculos (2026-08-12)

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

## Cómo probar
`npm test` → `tests/templates.test.js` (plantillas y saltados) y `tests/muscles.test.js` (incluye `exerciseGroup` y `planMuscleReview`; incluida una sobre los 36 ejercicios reales del seed: ninguno sin músculos ni fuera de la taxonomía).

## Lecciones que aplican
14, 30, 31, 32, 33.

## graphify
`graphify explain "openTemplateEditor"` · `graphify explain "pickExercise"` · `graphify explain "skippedStreak"` · `graphify explain "buildMusclePicker"` · `graphify explain "planMuscleMigration"` · `graphify explain "canonicalMuscle"`
