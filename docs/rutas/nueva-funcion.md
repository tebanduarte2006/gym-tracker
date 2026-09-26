# Ruta: función nueva

## Antes de programar
1. Revisa `../proyecto/progreso.md` ("Lo que sigue" y "Pendientes") y `../proyecto/decisiones.md`: no propongas lo ya descartado sin una razón nueva (plantillas como entidad, hábitos o salud mental, widgets o Live Activities, frameworks o bundlers).
2. Si el pedido no está claro, pregunta a Esteban **con opciones concretas**, no con preguntas abiertas.
3. Lee `../convenciones.md`: cada pieza (pantalla, cálculo, preferencia, prueba) tiene un patrón que se copia.

## Cómo construirla
1. Una rama para la función; cambios pequeños, cada uno probado.
2. Cálculo → módulo puro (`js/<tema>.js`, sin DOM ni IndexedDB) + `tests/<tema>.test.js`.
3. Interfaz → la pestaña que corresponda en `js/ui/`, con `el()` y clases `g-*` de `styles.css`, siguiendo [interfaz-y-diseno.md](interfaz-y-diseno.md) y [movimiento-y-transiciones.md](movimiento-y-transiciones.md). Si la carga es asíncrona, **encadena su promesa** al render.
4. Preferencia nueva → `prefGet`/`prefSet` + `PREFS_IMPORTABLES`. Cambio de esquema → [datos-y-respaldos.md](datos-y-respaldos.md).
5. Archivo nuevo → `ASSETS` en `sw.js`.
6. Si es un área nueva, crea su ruta en `docs/rutas/` (copia la estructura de [entrenar.md](entrenar.md)) y una fila en `docs/00-INDICE.md`.
7. Agrega su lista de chequeo a `../esteban/pruebas-iphone.md`.
8. Verifica y publica según [publicar-y-verificar.md](publicar-y-verificar.md).
