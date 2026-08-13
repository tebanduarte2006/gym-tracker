// dragorder.js — reordenar por pulsación larga y arrastre, estilo homescreen
// de iOS. Pedido por Esteban (2026-08-12) para los ejercicios de la sesión
// activa, en lugar de los botones ↑ / ↓.
//
// ─── Por qué está escrito así ─────────────────────────────────────────────────
// · Pointer Events, no touch+mouse por separado: iOS Safari los soporta desde
//   la 13 y así hay UN solo camino de código.
// · La pulsación larga se CANCELA si el dedo se mueve más de UMBRAL_SCROLL antes
//   de que venza el temporizador. Sin eso, cualquier scroll que empiece sobre
//   una card acabaría arrastrándola: el gesto de scroll y el de arrastrar nacen
//   idénticos y solo se distinguen por lo que pasa en los primeros milisegundos.
// · Durante el arrastre se hace preventDefault del touchmove Y se pone
//   `touch-action: none`: hace falta lo primero para que iOS no scrollee la
//   página, y lo segundo para que no cancele el pointer a mitad del gesto.
// · setPointerCapture para no perder el dedo si sale del elemento.
// · No se toca el DOM real hasta soltar: mientras arrastras, las tarjetas se
//   mueven con `transform`. Reordenar nodos en vivo dispara reflows y hace que
//   el elemento bajo el dedo cambie a media pasada.
//
// El orden es SIEMPRE por índice de posición, nunca por coordenada absoluta: la
// lista puede tener tarjetas de alturas distintas (una abierta y las demás
// cerradas es lo normal en pleno entrenamiento).

// 320 ms, no 420: iOS levanta su propio menú contextual y la lupa de selección
// alrededor de los 500 ms, y a 420 el gesto competía con ellos justo al final de
// la espera. A 320 se resuelve antes y sigue siendo claramente un "mantener
// pulsado" y no un toque (Strong y Hevy andan por ahí).
const MS_LARGA = 320;
// 10 px, no 8: el pulgar sudado tiembla, y cancelar la pulsación larga por
// temblor era parte del "funciona el 10% de las veces".
const UMBRAL_SCROLL = 10;

// Activa el arrastre sobre `contenedor`. Cada hijo directo con [data-drag-id]
// es un elemento reordenable.
//   onDrop(nuevoOrdenDeIds) — se llama SOLO si el orden cambió de verdad.
//   onStart / onEnd — para que la UI pueda avisar (vibración visual, etc).
// Devuelve una función para desactivarlo.
export function enableDragOrder(contenedor, opts = {}) {
  const onDrop = typeof opts.onDrop === 'function' ? opts.onDrop : () => {};
  const onStart = typeof opts.onStart === 'function' ? opts.onStart : () => {};
  const onEnd = typeof opts.onEnd === 'function' ? opts.onEnd : () => {};

  let temporizador = null;
  let arrastrando = false;
  let item = null;          // elemento que se arrastra
  let hermanos = [];        // [{ el, alto, top, bottom }]
  let desde = 0;            // índice inicial
  let hasta = 0;            // índice destino actual
  let yInicial = 0;         // dedo al empezar el arrastre (ya en modo compacto)
  let yActual = 0;          // última posición conocida del dedo
  let ancla = 0;            // corrección para que la tarjeta quede bajo el dedo
  let gap = 0;              // separación entre tarjetas, medida UNA vez
  let rafId = null;
  let pointerId = null;

  const itemDe = (target) => {
    const nodo = target && target.closest ? target.closest('[data-drag-id]') : null;
    return nodo && nodo.parentNode === contenedor ? nodo : null;
  };

  function limpiarTemporizador() {
    if (temporizador) { clearTimeout(temporizador); temporizador = null; }
  }

  function medir() {
    // El `gap` se lee AQUÍ y no en cada `pintar()`. Llamar a getComputedStyle
    // en cada pointermove fuerza un recálculo de estilo por evento — y
    // pointermove llega más veces por segundo que frames hay: era la fuente
    // principal de tirones.
    const estilo = getComputedStyle(contenedor);
    gap = parseFloat(estilo.rowGap || estilo.gap || '0') || 0;
    // Bandas verticales de cada tarjeta YA en modo compacto. Siguen siendo
    // válidas todo el gesto porque los hermanos se mueven con `transform` (no
    // cambian de sitio real) y el scroll está bloqueado.
    hermanos = [...contenedor.children]
      .filter((n) => n.hasAttribute && n.hasAttribute('data-drag-id'))
      .map((n) => {
        const r = n.getBoundingClientRect();
        return { el: n, alto: r.height, top: r.top, bottom: r.bottom };
      });
    desde = hermanos.findIndex((h) => h.el === item);
    hasta = desde;
  }

  function entrarEnArrastre() {
    // El orden importa: PRIMERO se marca el modo reordenar —que colapsa todas
    // las tarjetas a la altura del nombre— y solo DESPUÉS se mide. Medir antes
    // guardaría la altura de la tarjeta abierta (~400 px frente a ~56 px de las
    // cerradas) y todo el cálculo de huecos saldría mal.
    //
    // Colapsar no es cosmético: arrastrar una tarjeta de 400 px por una pantalla
    // de 896 px es mover un bloque que tapa media lista, y con alturas
    // desiguales el hueco que deja nunca coincide con el que ocupa. En modo
    // compacto todas miden lo mismo, caben de golpe en pantalla y el gesto se
    // vuelve exacto — es lo que hace el homescreen del iPhone al entrar en modo
    // de reorganización.
    contenedor.classList.add('g-reordenando');
    medir();
    if (desde < 0) { contenedor.classList.remove('g-reordenando'); return; }
    arrastrando = true;
    item.classList.add('g-arrastrando');

    // Tras colapsar, la lista se recompone y la tarjeta ya no está donde estaba
    // el dedo. Se corrige de una vez para que quede centrada bajo él, en lugar
    // de dejarla desplazada el resto del gesto.
    const r = hermanos[desde];
    yInicial = yActual;
    ancla = yActual - (r.top + r.alto / 2);
    pintar();
    onStart(item);
  }

  // Recoloca visualmente los hermanos para dejar el hueco en `hasta`.
  // Se llama SIEMPRE desde un rAF: pointermove puede dispararse varias veces
  // entre dos frames y escribir `transform` en cada una es trabajo tirado.
  function pintar() {
    const paso = hermanos[desde].alto + gap;
    const dy = yActual - yInicial + ancla;

    hermanos.forEach((h, i) => {
      if (i === desde) {
        h.el.style.transform = 'translateY(' + dy + 'px)';
        return;
      }
      let mover = 0;
      // Los que quedan entre el origen y el destino se desplazan una posición
      // en sentido contrario al movimiento del dedo.
      if (desde < hasta && i > desde && i <= hasta) mover = -paso;
      else if (desde > hasta && i >= hasta && i < desde) mover = paso;
      h.el.style.transform = mover ? 'translateY(' + mover + 'px)' : '';
    });
  }

  function pedirPintado() {
    if (rafId != null) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      if (arrastrando) pintar();
    });
  }

  // El destino es la tarjeta sobre cuya banda original está el DEDO.
  //
  // La primera versión acumulaba desplazamiento ("¿cuántas alturas he
  // recorrido?") y fallaba justo en el caso normal de esta app: durante el
  // entrenamiento hay una tarjeta abierta (~400 px) entre varias cerradas
  // (~90 px). Arrastrar la abierta movía el dedo mucho más que la altura de sus
  // vecinas y el ejercicio aterrizaba dos posiciones más abajo de donde
  // apuntaba. El dedo es la única referencia que no depende de las alturas.
  function calcularDestino(clientY) {
    if (hermanos.length === 0) return desde;
    if (clientY <= hermanos[0].top) return 0;
    const ultimo = hermanos.length - 1;
    if (clientY >= hermanos[ultimo].bottom) return ultimo;
    for (let i = 0; i < hermanos.length; i++) {
      if (clientY >= hermanos[i].top && clientY <= hermanos[i].bottom) return i;
    }
    return desde; // en un hueco entre tarjetas: no se cambia de idea
  }

  function onPointerDown(e) {
    if (e.button != null && e.button !== 0) return;      // solo botón principal
    // Un control dentro de la tarjeta (registrar, borrar, editar…) manda: no se
    // puede secuestrar su toque con una pulsación larga.
    if (e.target.closest('button, input, a, summary, [data-no-drag]') &&
        !e.target.closest('[data-drag-handle]')) return;
    const candidato = itemDe(e.target);
    if (!candidato) return;
    item = candidato;
    pointerId = e.pointerId;
    yInicial = e.clientY;
    yActual = e.clientY;
    limpiarTemporizador();
    temporizador = setTimeout(() => {
      temporizador = null;
      try { contenedor.setPointerCapture(pointerId); } catch { /* ya capturado */ }
      entrarEnArrastre();
    }, MS_LARGA);
  }

  function onPointerMove(e) {
    if (item == null || (pointerId != null && e.pointerId !== pointerId)) return;
    if (!arrastrando) {
      // Movimiento antes de que venza la pulsación larga = el usuario quería
      // scrollear. Se cancela y la página se comporta como siempre.
      if (temporizador && Math.abs(e.clientY - yInicial) > UMBRAL_SCROLL) {
        limpiarTemporizador();
        item = null;
      }
      yActual = e.clientY;
      return;
    }
    // El preventDefault de VERDAD va en `touchmove` (ver onTouchMove). Este de
    // aquí solo sirve en escritorio; en iOS no impide el scroll.
    e.preventDefault();
    yActual = e.clientY;
    hasta = calcularDestino(yActual);
    pedirPintado();
  }

  // ─── LO QUE HACE QUE EL GESTO FUNCIONE EN iOS ───────────────────────────────
  // Esteban lo describió como "funciona el 10% de las veces: a veces se resalta
  // la tarjeta pero es imposible moverla, y en vez de moverse solo scrollea".
  // Son dos creencias falsas, las dos habituales:
  //
  //   1. `preventDefault()` sobre un POINTERMOVE no cancela el scroll en iOS
  //      Safari. Solo lo cancela sobre `touchmove`, y solo si el listener es
  //      `{passive:false}`. Sin esto, en cuanto el dedo se movía iOS scrolleaba
  //      la página y se llevaba el gesto: la tarjeta quedaba levantada pero
  //      inmóvil, exactamente lo que él veía.
  //   2. `touch-action:none` puesto AL ENTRAR en modo arrastre llega tarde. El
  //      navegador decide si un toque puede scrollear cuando el toque EMPIEZA;
  //      cambiar la propiedad a mitad del gesto no lo deshace.
  //
  // Por eso se prohíbe el scroll aquí, en el evento correcto, y solo mientras se
  // arrastra de verdad: antes de que venza la pulsación larga el scroll tiene
  // que seguir funcionando con normalidad.
  function onTouchMove(e) {
    if (arrastrando && e.cancelable) e.preventDefault();
  }

  // Tras un arrastre de verdad, el navegador dispara igualmente el `click` del
  // elemento donde empezó el gesto. Si el asa es la cabecera de la tarjeta (que
  // además abre y cierra el ejercicio), reordenar dejaría la card colapsada sin
  // que nadie la haya tocado. Se traga ese único click en fase de captura.
  function tragarSiguienteClick() {
    const swallow = (ev) => {
      ev.stopPropagation();
      ev.preventDefault();
    };
    contenedor.addEventListener('click', swallow, { capture: true, once: true });
    // Si por lo que sea no llega ningún click, no se puede dejar el listener
    // esperando al próximo toque legítimo.
    setTimeout(() => contenedor.removeEventListener('click', swallow, { capture: true }), 350);
  }

  function soltar() {
    limpiarTemporizador();
    if (!arrastrando) { item = null; return; }
    arrastrando = false;
    if (rafId != null) { cancelAnimationFrame(rafId); rafId = null; }
    tragarSiguienteClick();
    contenedor.classList.remove('g-reordenando');
    if (item) item.classList.remove('g-arrastrando');
    hermanos.forEach((h) => { h.el.style.transform = ''; });

    if (hasta !== desde && desde >= 0) {
      const ids = hermanos.map((h) => h.el.getAttribute('data-drag-id'));
      const [movido] = ids.splice(desde, 1);
      ids.splice(hasta, 0, movido);
      onDrop(ids);
    }
    // `onEnd` marca la hora de fin. Tragar el click en fase de captura no basta
    // en iOS —a veces no llega ningún click y a veces llega tras el re-render—,
    // así que quien escucha el toque comprueba además si acaba de haber un
    // arrastre. Es determinista y no depende del orden de los eventos.
    onEnd();
    item = null;
    hermanos = [];
  }

  function onPointerUp(e) {
    if (pointerId != null && e && e.pointerId !== pointerId) return;
    soltar();
  }
  function onPointerCancel(e) { onPointerUp(e); }

  // `pointerdown` va en el contenedor (es donde nace el gesto), pero move y up
  // van en WINDOW. Colgarlos del contenedor tenía un fallo real: si el dedo se
  // sale de la lista antes de que venza la pulsación larga —hacia el cronómetro
  // de arriba, por ejemplo— el contenedor deja de recibir eventos, la
  // cancelación por movimiento nunca llega y el arrastre arrancaba igual, con el
  // dedo ya lejos. En window se ve el gesto entero pase por donde pase.
  // `passive: false` es imprescindible: sin él el navegador ignora el
  // preventDefault y la página scrollea bajo el dedo mientras arrastras.
  contenedor.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove, { passive: false });
  // `passive:false` NO es opcional: con el listener pasivo el navegador ignora
  // el preventDefault y scrollea igual. Es la línea de la que depende que el
  // arrastre funcione en el iPhone.
  window.addEventListener('touchmove', onTouchMove, { passive: false });
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerCancel);
  // El menú contextual de una pulsación larga en iOS/Android taparía el gesto.
  contenedor.addEventListener('contextmenu', (e) => { if (arrastrando) e.preventDefault(); });

  return function disable() {
    limpiarTemporizador();
    if (rafId != null) { cancelAnimationFrame(rafId); rafId = null; }
    contenedor.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('touchmove', onTouchMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerCancel);
  };
}
