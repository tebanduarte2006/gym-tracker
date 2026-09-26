# Guía de vibe coding para gym-tracker

Para Esteban: cómo mejorar esta app dirigiendo agentes de IA (Claude Code) sin escribir código.

Base: *Vibe Coding: Zero to Hero* ([The Vibe Coding Handbook](https://github.com/hacrex/the-vibe-coding-handbook), licencia MIT), la misma que usa la guía de Plata. Cada sección dice de qué parte del manual sale. Aquí se adapta a quien solo dirige agentes y a este proyecto: PWA sin dependencias (HTML, CSS y JavaScript), datos en el iPhone (IndexedDB), publicada en GitHub Pages.

## 0. La idea en una frase

Tú decides qué se construye y compruebas que funciona; el agente escribe el código. El manual lo resume así: "AI suggests, humans decide" (01 What Is Vibe Coding, «Human in the Loop»). Tu trabajo tiene tres partes: pedir bien, avanzar en pasos pequeños y verificar en el iPhone. Nada está hecho hasta que lo ves funcionar en el gimnasio.

## 1. Cómo pedir algo: cuatro partes

Fuente: 07 Prompt Engineering, «Provide Context», «Be Specific and Detailed», «Constraint-Based Prompting», «Prompt Quality Checklist»; 01, «Context is King».

| Parte | Qué escribes | Ejemplo en gym-tracker |
|---|---|---|
| Contexto | Qué existe hoy relacionado con tu pedido | "El temporizador de descanso ya existe y suena al terminar." |
| Objetivo | Qué quieres lograr, visto desde el uso | "Quiero ver cuántas series llevo de cada músculo durante la sesión, no solo en Progresión." |
| Restricciones | Lo que no se toca y los límites | "No cambies cómo se registra un set. Nada que cueste plata." |
| Criterios de aceptación | Algo que puedas comprobar tú en el iPhone | "Registro un set de press banca y el contador de Pecho sube de 3 a 4 sin recargar." |

No hace falta que le digas qué leer: CLAUDE.md ya le indica al agente el índice y la ruta de su tarea.

Reglas cortas:

- **Concreto, no vago.** Malo: "arregla el descanso". Bueno: "al tocar el ✓ de un set, el descanso arranca en 90 s aunque el ejercicio tenga 120 configurados". (07, «Common Mistakes: Too Vague / Missing Context».)
- **Un pedido, un objetivo.** Si tu mensaje tiene "y también...", son dos pedidos. (07, «Overcomplicating».)
- **Plan antes que código**, para cambios grandes: "Antes de tocar nada, dime en 5 líneas qué vas a cambiar y cómo lo voy a probar. Espera mi OK." (22 AI Agents, «Plan-and-Execute».)
- **Cita sus palabras cuando reportes una sensación.** "Se siente brusco", "no la oigo con la música": los agentes de este proyecto han resuelto mejor los problemas cuando tenían tu frase exacta.

## 2. Pasos pequeños y verificables

Fuente: 01, «Iterative Refinement» y «Progressive Disclosure»; 02, «Helpful Prompts When Stuck».

Cada función se parte en pasos que puedas ver. Ejemplo con "aviso de PR al registrar":

1. Al registrar un set que supera tu mejor peso de ese ejercicio, aparece un aviso.
2. También cuenta el PR de repeticiones con el mismo peso.
3. Los sets propuestos (apagados) nunca disparan el aviso.

Regla: el paso 2 no empieza hasta que el paso 1 pasó tu prueba en el iPhone. Si un paso no se puede comprobar en el iPhone ni con una prueba automática, está mal partido.

Prompt útil: "Divide [función] en pasos que yo pueda probar uno por uno en el iPhone. Para cada paso: qué hace, cómo lo verifico y qué suele fallar."

## 3. La documentación que el agente mantiene

Fuente: 17 Real-World Workflows, «Documentation Updates», «Knowledge Sharing»; 28 Failure Patterns, «Pattern 9: No Documentation» y «Pattern 11: Knowledge Silos».

Cada sesión con un agente empieza sin memoria. Estos archivos son la memoria del proyecto:

```
gym-tracker/
├── CLAUDE.md                 reglas para agentes (se lee en cada sesión, por eso es corto)
├── README.md                 qué es la app
├── graphify-out/             mapa del código para que los agentes no lean todo
└── docs/
    ├── 00-INDICE.md          índice: qué leer según la tarea
    ├── convenciones.md       la única forma aceptada de hacer cada cosa
    ├── rutas/                una ruta por tipo de tarea (entrenar, descanso, gestos…)
    ├── proyecto/             progreso, decisiones, lecciones, historial
    └── esteban/              esta guía y las pruebas del iPhone
```

Funciona como una biblioteca con catálogo: el agente consulta el índice, va a la estantería de su tarea y solo abre los libros que esa estantería le indica. Antes el agente tenía que leer un README de 1.070 líneas para cualquier cosa, incluso cambiar un color.

- **decisiones.md**: por qué la app es como es y qué se descartó (plantillas, widgets, el vidrio). Evita que un agente nuevo te proponga otra vez lo que ya rechazaste.
- **lecciones.md**: 60 errores reales numerados. Cada ruta cita los que aplican.
- **progreso.md**: estado, lo que sigue, pendientes. Sirve para retomar con otro agente.
- Regla: la documentación se actualiza en el mismo commit que el cambio (17, «Documentation Updates»).

## 4. Git sin tecnicismos: nunca perder trabajo

Fuente: 25 Cheat Sheets, «Git Quick Reference»; 17, «Rollback Procedures».

| Palabra | Qué es en la práctica |
|---|---|
| Repositorio | La carpeta del proyecto con todo su historial. |
| Commit | Un punto de guardado con nombre. Puedes volver a cualquiera. |
| Rama (branch) | Un borrador paralelo del expediente, para probar sin dañar lo que funciona. |
| main | La versión oficial. Es la que GitHub Pages publica en tu iPhone. |
| Push | Subir los puntos de guardado a GitHub: tu respaldo fuera del computador. |
| Merge o PR | Incorporar el borrador al expediente oficial, después de probarlo. |

Reglas:

1. Cada función en su rama.
2. **Merge automático (tu decisión del 2026-09-26):** el agente une su rama a `main` solo cuando las pruebas pasan. Lo sensible (tus datos, el formato del export, costos, quitar funciones) espera tu "sí".
3. Prohibido sin tu permiso explícito: `git push --force`, `git reset --hard`, `git clean`, borrar ramas. Pueden borrar trabajo. Si un agente las propone, pregunta "¿qué se pierde si haces eso?".
4. Si algo se perdió, no rehagas nada: pide "busca el trabajo perdido con git reflog".
5. Para deshacer algo que ya está en `main`: "revierte ese commit con git revert". Crea un commit nuevo que deshace el anterior sin borrar historia.
6. **Tus entrenamientos NO están en git**: viven en el iPhone. Git guarda la app, no tus datos. Exporta un respaldo antes de cualquier cambio que toque datos (Progresión → DATOS → Exportar).

## 5. Verificar sin saber programar

Fuente: 01, «Verification is Key»; 13 Testing & Debugging, «Best Practices»; 17, «Pre-Deployment Checklist».

Tú no revisas código; revisas comportamiento. Hay dos capas.

**Capa 1: pruebas automáticas y capturas.** Las hace el agente; tú exiges ver el resultado. Prioridad: lo que toca tus números (PR, volumen, kg↔lbs, que un set propuesto nunca cuente). Pide: "Pégame la salida de `npm test` y muéstrame las capturas en claro y oscuro."

**Capa 2: checklist en el iPhone.** Cada función tiene su lista en `docs/esteban/pruebas-iphone.md`; el agente la escribe junto con la función y tú la marcas. Algunas cosas **solo** se pueden comprobar en el iPhone: gestos, sonido con la pantalla bloqueada, exportar con la app instalada. Un agente honesto te lo dice en "Qué no pude comprobar".

Cuando algo falla, repórtalo así:

```
Qué hice: ...
Qué esperaba: ...
Qué pasó: ...
Dónde: app instalada o Safari, modo claro u oscuro
Captura o grabación de pantalla: adjunta
Desde cuándo: funcionaba ayer / nunca funcionó
```

Y pide causas antes que arreglos: "Dame 3 causas posibles y cómo confirmar cuál es, antes de cambiar código." En este proyecto funcionó: el "parpadeo" al cambiar de pestaña no era falta de animación sino el orden en que se pintaba.

## 6. Patrones de falla y cómo detectarlos

Fuente: 28 Failure Patterns; 14 Security, «Hallucinated Security Functions»; 01, «Context Window Management».

| Patrón | Señal | Qué haces |
|---|---|---|
| Dice "listo" y no está listo (28, Pattern 1 y 7) | "Implementado" sin pruebas ni capturas; "debería funcionar" | "Muéstrame la salida de las pruebas y los pasos exactos para verlo en el iPhone." |
| Lo probó en el computador, no como un iPhone | Un gesto o un scroll "verificado" que en tu teléfono falla | Ya pasó tres veces seguidas. Pregunta: "¿Lo probaste con eventos táctiles reales o con el ratón?" |
| El alcance crece solo (28, Pattern 3) | Tocó archivos que no tenían que ver, "de paso mejoré..." | "Lista los archivos que cambiaste y por qué cada uno." Lo que no pediste se deshace. |
| Espagueti (28, Pattern 2) | Arreglar algo rompe otra cosa; el mismo cálculo en varios lados | "¿Esto sigue docs/convenciones.md? ¿Hay dos formas de hacer lo mismo?" |
| Promesas imposibles (14) | Widgets en la pantalla de inicio, Live Activities, vibración, "suena siempre con la pantalla bloqueada" | "Dame el enlace a la documentación oficial." Cruza con `docs/proyecto/decisiones.md`. |
| Arreglo en círculos | Tercer intento con el mismo error, cada vez con otra teoría | Para. Sesión nueva, reporte con la plantilla de la sección 5. |
| Te pide reinstalar la app | "Bórrala y vuélvela a instalar" | **Nunca.** Borra tus datos. Progresión → DATOS → **Buscar actualización**. |
| Conocimiento que solo está en un chat (28, Pattern 11) | Nadie sabe por qué algo es así | Exige que quede en `decisiones.md` o en la ruta del tema. |

## 7. Plantilla para pedir una función nueva

Basada en 07, «Template 1: New Feature Development». Copia, llena lo que está entre corchetes y borra lo que no aplique.

```
# Función: [nombre corto]

## Objetivo
Quiero que [qué pasa, desde mi punto de vista en el gimnasio].

## Restricciones
- No toques [registrar sets / el descanso / otra función]. Si es necesario, pregúntame antes.
- Nada que tenga costo ni dependencias nuevas.
- Nada fuera de este pedido. Si ves algo que convenga, anótalo en docs/proyecto/progreso.md.

## Criterios de aceptación (los compruebo yo en el iPhone)
- [ ] [comportamiento visible 1]
- [ ] [caso raro: sin señal, peso 0, ejercicio sin sets, modo oscuro]
- [ ] Lo que ya funcionaba sigue funcionando.

## Cómo quiero que trabajes
1. Si es grande, antes de escribir código dame un plan corto y espera mi OK.
2. Pruebas automáticas y capturas; pégame el resultado.
3. Agrega la checklist de esta función a docs/esteban/pruebas-iphone.md.
4. Al final, el mensaje de siempre: qué cambió, qué hago yo, qué no pudiste comprobar.
```

## 8. Rutina de una sesión

1. Pedir un solo objetivo (con la plantilla si es una función grande).
2. Responder sus preguntas, si las hace. El agente trabaja en silencio: solo te escribe para preguntar o alertar.
3. Recibir un solo mensaje final: qué cambió, qué tienes que hacer tú, qué no pudo comprobar.
4. El agente ya publicó (merge automático), salvo algo sensible. Espera 2 minutos, sal de la app y vuelve a entrar: se actualiza sola. **Nunca la borres.**
5. Probar en el iPhone con la lista de `docs/esteban/pruebas-iphone.md`. Si algo falla, reporte con la plantilla de la sección 5.

Si la conversación se alarga y el agente empieza a olvidar cosas, pide que actualice `docs/proyecto/progreso.md` y abre una sesión nueva (01, «Context Window Management»).
