# Ruta: movimiento y transiciones

## Qué es
Cómo se anima la app: cambio de pestaña, abrir y cerrar tarjetas, bottom sheets, respuesta al toque. **El movimiento es parte del sistema, no un adorno que se añade al final.** Las duraciones y curvas están medidas frame a frame; no las cambies "a ojo".

## Archivos y funciones
| Dónde | Qué |
|---|---|
| `js/main.js` | `switchTab` (pinta oculto, revela lleno, `TOPE_MS`), `ARRANQUE_TOPE_MS` |
| `js/ui/entrenar.js` | `colapsable` (rejilla `0fr → 1fr`, dos divs) |
| `js/ui/modals.js` | `sheet`, `closeOverlay` (cierre animado), `lockScroll` / `unlockScroll` (`position:fixed` + `scrollY`: lección 20) |
| `js/dom.js` | `sinMovimiento()`: consultarla en TODA espera programada en JS |
| `styles.css` | tokens `--ease`, `--ease-in`, `--ease-size`, `--base`; bloque `prefers-reduced-motion` |

## Reglas (2026-09-13)

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
  `.open` por lo de siempre (`gestos-y-reordenar.md` y lección 37).

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

## Cómo probar
Medir, no mirar: altura del panel en el primer frame visible (debe ser la final), incremento por frame al abrir una tarjeta (salto máximo ≤ 37 px con `--ease-size`), frames > 32 ms con la CPU 6× y 10× más lenta (`Emulation.setCPUThrottlingRate` por CDP). Con `prefers-reduced-motion`, ninguna espera.

## Lecciones que aplican
38, 53, 54, 55, 56, 57, 58, 59, 60.

## graphify
`graphify explain "switchTab"` · `graphify explain "colapsable"` · `graphify explain "sinMovimiento"`
