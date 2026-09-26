# Índice: por dónde empezar según la tarea

Lee **solo** la fila de tu tarea. Cada ruta dice qué archivos abrir, qué funciones importan, qué reglas no se rompen, cómo probar y qué lecciones aplican. Si tu tarea cruza dos rutas, lee ambas; no leas las demás.

| Si tu tarea es sobre… | Lee |
|---|---|
| Sesión activa, sets, registrar, autollenado del día, cardio, finalizar, tarjetas de ejercicio, pantalla de inicio | [rutas/entrenar.md](rutas/entrenar.md) |
| Reordenar arrastrando, **cualquier gesto, scroll o área táctil** | [rutas/gestos-y-reordenar.md](rutas/gestos-y-reordenar.md) |
| Temporizador de descanso, alarma, sonido, pantalla bloqueada, Wake Lock | [rutas/descanso-y-alarma.md](rutas/descanso-y-alarma.md) |
| Pestaña Ejercicios, crear o editar ejercicios, músculos | [rutas/ejercicios-y-musculos.md](rutas/ejercicios-y-musculos.md) |
| Pestaña Progresión, PR, volumen, gráfica, calculadora de discos | [rutas/progresion-y-estadisticas.md](rutas/progresion-y-estadisticas.md) |
| IndexedDB, esquema, preferencias, exportar/importar, respaldos, seed | [rutas/datos-y-respaldos.md](rutas/datos-y-respaldos.md) |
| Colores, letra, tema claro/oscuro, componentes, accesibilidad | [rutas/interfaz-y-diseno.md](rutas/interfaz-y-diseno.md) |
| Animaciones, cambio de pestaña, abrir/cerrar tarjetas y sheets, "se siente brusco" | [rutas/movimiento-y-transiciones.md](rutas/movimiento-y-transiciones.md) |
| La app no arranca, pantalla negra, actualizaciones, service worker, "no veo los cambios" | [rutas/arranque-y-actualizaciones.md](rutas/arranque-y-actualizaciones.md) |
| Publicar, CI, capturas, cómo verificar | [rutas/publicar-y-verificar.md](rutas/publicar-y-verificar.md) |
| Función nueva | [rutas/nueva-funcion.md](rutas/nueva-funcion.md) |

## Antes de escribir código

[convenciones.md](convenciones.md): mapa de archivos, dónde va cada cosa y la única forma aceptada de resolver cada problema recurrente (regla dorada, CLAUDE.md §0). Léelo siempre que vayas a programar.

## Memoria del proyecto

| Documento | Qué tiene | Cuándo leerlo |
|---|---|---|
| [proyecto/progreso.md](proyecto/progreso.md) | Estado, lo que sigue, pendientes, ideas | Siempre, sección "Lo que sigue" |
| [proyecto/decisiones.md](proyecto/decisiones.md) | Por qué el proyecto es como es y qué se descartó | Antes de proponer cambiar arquitectura o una función |
| [proyecto/lecciones.md](proyecto/lecciones.md) | 60 errores reales, numerados | Solo los números que cite tu ruta (`grep -n "^38\."`) |
| [proyecto/historial.md](proyecto/historial.md) | Una fila por entrega | Para agregar tu fila; léelo solo si investigas por qué algo cambió |

## Documentos para Esteban (lenguaje sencillo)

| Documento | Para qué |
|---|---|
| [esteban/guia-vibe-coding.md](esteban/guia-vibe-coding.md) | Cómo dirigir agentes: pedidos, verificación, git, señales de alarma |
| [esteban/pruebas-iphone.md](esteban/pruebas-iphone.md) | Listas de chequeo para probar en el iPhone |

## Referencias viejas "README §N"

Hasta el 2026-09-26 todo vivía en un README de 1.070 líneas. `historial.md`, `lecciones.md` y algunos comentarios viejos citan sus secciones:

| Cita vieja | Ahora está en |
|---|---|
| §2 (reglas), §2.7, §2.12, §2.14 | `CLAUDE.md` §6 y `convenciones.md` ("Verificar") |
| §3 Arquitectura | `convenciones.md` ("Mapa de archivos") |
| §Arranque, actualizaciones | `rutas/arranque-y-actualizaciones.md` |
| §4 Schema | `rutas/datos-y-respaldos.md` |
| §5 Decisiones | `proyecto/decisiones.md` |
| §5.1 Vidrio Negro | `rutas/interfaz-y-diseno.md` (reemplazado por el tema crema/Everforest) |
| §5.2, §5.7, render quirúrgico | `rutas/entrenar.md` |
| §5.3 | `rutas/ejercicios-y-musculos.md` |
| §5.4, §5.5 | `rutas/gestos-y-reordenar.md` |
| §5.6 | `rutas/descanso-y-alarma.md` |
| §5.8 | `rutas/movimiento-y-transiciones.md` |
| §6 Deploy | `rutas/publicar-y-verificar.md` |
| §7 Lecciones · §8 Pendientes · §9 Historial | `proyecto/lecciones.md` · `proyecto/progreso.md` · `proyecto/historial.md` |

## Mantener este índice

Al crear un área nueva: agrega su ruta en `rutas/` (copia la estructura de `rutas/entrenar.md`: Qué es, Archivos y funciones, reglas, Cómo probar, Lecciones que aplican, graphify) y una fila arriba. Una ruta desactualizada se corrige en el mismo commit que la dejó vieja.
