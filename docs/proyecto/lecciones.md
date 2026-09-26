# Lecciones aprendidas

Catálogo numerado de errores reales de este proyecto y de su antecesor (habitos-app). Otros documentos las citan por número ("lección 38"). **No las leas todas**: cada ruta de `docs/rutas/` dice cuáles aplican a su tema. Búscalas con `grep -n "^38\." docs/proyecto/lecciones.md`.

**Agregar una lección**: número siguiente al final, en el mismo formato (regla en negrilla + el caso que la enseñó), y cítala en la ruta de su tema. No se renumeran ni se borran: otros textos apuntan a esos números.

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
