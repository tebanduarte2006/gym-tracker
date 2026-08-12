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

const MS_LARGA = 420;        // pulsación larga antes de entrar en modo arrastre
const UMBRAL_SCROLL = 8;     // px de movimiento que cancelan la pulsación larga

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
  let hermanos = [];        // [{ el, alto, centroInicial }]
  let desde = 0;            // índice inicial
  let hasta = 0;            // índice destino actual
  let yInicial = 0;
  let pointerId = null;

  const itemDe = (target) => {
    const nodo = target && target.closest ? target.closest('[data-drag-id]') : null;
    return nodo && nodo.parentNode === contenedor ? nodo : null;
  };

  function limpiarTemporizador() {
    if (temporizador) { clearTimeout(temporizador); temporizador = null; }
  }

  function medir() {
    // Se guardan las bandas verticales ORIGINALES de cada tarjeta. Siguen
    // siendo válidas durante todo el gesto porque los hermanos se mueven con
    // `transform` (no cambian de sitio real) y el scroll está bloqueado.
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
    arrastrando = true;
    medir();
    if (desde < 0) { arrastrando = false; return; }
    contenedor.classList.add('g-reordenando');
    item.classList.add('g-arrastrando');
    // Separación entre elementos: se lee del gap real para que el hueco que deja
    // el elemento levantado coincida con el que ocupaba.
    onStart(item);
  }

  // Recoloca visualmente los hermanos para dejar el hueco en `hasta`.
  function pintar(dy) {
    const altoItem = hermanos[desde].alto;
    const estilo = getComputedStyle(contenedor);
    const gap = parseFloat(estilo.rowGap || estilo.gap || '0') || 0;
    const paso = altoItem + gap;

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
    limpiarTemporizador();
    temporizador = setTimeout(() => {
      temporizador = null;
      try { contenedor.setPointerCapture(pointerId); } catch { /* ya capturado */ }
      entrarEnArrastre();
    }, MS_LARGA);
  }

  function onPointerMove(e) {
    if (!arrastrando) {
      // Movimiento antes de que venza la pulsación larga = el usuario quería
      // scrollear. Se cancela y la página se comporta como siempre.
      if (temporizador && Math.abs(e.clientY - yInicial) > UMBRAL_SCROLL) {
        limpiarTemporizador();
        item = null;
      }
      return;
    }
    e.preventDefault();
    const dy = e.clientY - yInicial;
    hasta = calcularDestino(e.clientY);
    pintar(dy);
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
    onEnd();
    item = null;
    hermanos = [];
  }

  function onPointerUp() { soltar(); }
  function onPointerCancel() { soltar(); }

  // `passive: false` es imprescindible: sin él el navegador ignora el
  // preventDefault y la página scrollea bajo el dedo mientras arrastras.
  contenedor.addEventListener('pointerdown', onPointerDown);
  contenedor.addEventListener('pointermove', onPointerMove, { passive: false });
  contenedor.addEventListener('pointerup', onPointerUp);
  contenedor.addEventListener('pointercancel', onPointerCancel);
  // El menú contextual de una pulsación larga en iOS/Android taparía el gesto.
  contenedor.addEventListener('contextmenu', (e) => { if (arrastrando) e.preventDefault(); });

  return function disable() {
    limpiarTemporizador();
    contenedor.removeEventListener('pointerdown', onPointerDown);
    contenedor.removeEventListener('pointermove', onPointerMove);
    contenedor.removeEventListener('pointerup', onPointerUp);
    contenedor.removeEventListener('pointercancel', onPointerCancel);
  };
}
