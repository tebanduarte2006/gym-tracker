# Ruta: reordenar arrastrando y gestos táctiles en iOS

## Qué es
Pulsación larga + arrastre para reordenar los ejercicios de la sesión activa, como el homescreen del iPhone. Es la zona con más fallos llegados rotos al iPhone del proyecto (tres entregas seguidas): **lee todo esto antes de tocar cualquier gesto, scroll o área táctil**, en cualquier pantalla.

## Archivos y funciones
| Dónde | Qué |
|---|---|
| `js/ui/dragorder.js` | `enableDragOrder` (todo el gesto: `MS_LARGA`, umbral de cancelación, bandas, `requestAnimationFrame`) |
| `js/ui/entrenar.js` | `refreshExercises` (activa el arrastre), sello de tiempo del último arrastre que la cabecera consulta |
| `styles.css` | `.g-reordenando`, `data-drag-handle`, `touch-action`, `-webkit-touch-callout` |

## Reordenar arrastrando (`js/ui/dragorder.js`)

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

## Gestos táctiles en iOS (leer antes de tocar cualquier gesto)

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
(ver `entrenar.md`, «Las tarjetas de ejercicio NO se abren solas»), así que el caso desapareció por la raíz en vez de estar parcheado
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

## Cómo probar
`node scripts/capturas-iphone.mjs` no basta: el gesto se prueba con `Input.dispatchTouchEvent` por CDP en un contexto `devices['iPhone 11']` con `hasTouch: true`, comprobando las siete cosas de la tabla y la lista de arriba. Si no puedes, dilo en "Qué no pude comprobar"; no lo marques como verificado.

## Lecciones que aplican
20, 34, 35, 36, 37, 38, 40, 41, 42, 43, 44.

## graphify
`graphify explain "enableDragOrder"` · `graphify explain "refreshExercises"`
