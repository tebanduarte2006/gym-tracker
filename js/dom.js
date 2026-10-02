// dom.js — helpers de DOM. Sin innerHTML para contenido: todo texto entra
// como TextNode (la vieja app tenía un backdoor `html:` — aquí no existe).

export function el(tag, attrs, children) {
  const e = document.createElement(tag);
  if (attrs) {
    Object.keys(attrs).forEach((k) => {
      const v = attrs[k];
      if (v == null) return;
      if (k === 'class') e.className = v;
      else if (k === 'value') e.value = v;
      else e.setAttribute(k, v);
    });
  }
  if (children) {
    children.forEach((c) => {
      if (c == null || c === '') return;
      e.appendChild(typeof c === 'string' || typeof c === 'number'
        ? document.createTextNode(String(c))
        : c);
    });
  }
  return e;
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

let _toastTimer = null;
let _toastTouchListener = null;

// `accion` opcional: { label, onAction }. Convierte el toast en el patrón de
// deshacer de Apple — una acción destructiva de un solo toque (borrar un set en
// mitad de una serie) no debería exigir un diálogo de confirmación, pero
// tampoco puede ser irreversible por un roce con el pulgar.
export function toast(msg, accion) {
  const prev = document.querySelector('.toast');
  if (prev) prev.remove();
  if (_toastTimer) clearTimeout(_toastTimer);
  if (_toastTouchListener) document.removeEventListener('pointerdown', _toastTouchListener, true);
  _toastTouchListener = null;

  const t = el('div', { class: 'toast' }, [el('span', { class: 'toast-msg' }, [msg])]);
  const hide = () => {
    if (_toastTimer) { clearTimeout(_toastTimer); _toastTimer = null; }
    t.classList.remove('visible');
    setTimeout(() => t.remove(), 300);
  };

  if (accion && accion.label && typeof accion.onAction === 'function') {
    const btn = el('button', { class: 'toast-action', type: 'button' }, [accion.label]);
    btn.addEventListener('click', () => { hide(); accion.onAction(); });
    t.appendChild(btn);
  }

  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('visible'));
  if (t.querySelector('.toast-action')) {
    // Con acción (Deshacer) NO se va con un reloj: se queda hasta el siguiente
    // toque fuera de él. Apple pide no esconder con un temporizador algo que la
    // persona tiene que alcanzar a usar (docs/diseno-ios.md). Igual que Plata.
    _toastTouchListener = (event) => {
      if (event.target instanceof Element && event.target.closest('.toast')) return;
      document.removeEventListener('pointerdown', _toastTouchListener, true);
      _toastTouchListener = null;
      hide();
    };
    document.addEventListener('pointerdown', _toastTouchListener, true);
  } else {
    _toastTimer = setTimeout(hide, 2500);
  }
}

// Toda promesa de datos que alimente UI pasa por aquí: error visible, no
// pantalla en blanco silenciosa (bug sistémico de la app vieja).
export function guard(promise, contexto) {
  return promise.catch((err) => {
    console.error('[gym-tracker]', contexto, err);
    toast('Error: ' + contexto);
    // Marca para que main.js silencie el "unhandled rejection": el error YA se
    // reportó al usuario y se registró en consola. Se re-lanza para cortar la
    // cadena (nadie debe seguir pintando con datos que no llegaron).
    if (err && typeof err === 'object') {
      try { err._gymHandled = true; } catch { /* objeto congelado */ }
    }
    throw err;
  });
}

// ¿El sistema pide menos movimiento? `styles.css` ya anula las animaciones por
// CSS, pero el JS también programa esperas (el desvanecido de un panel, el
// cierre de un sheet) y esas hay que ponerlas a cero aquí: una espera sin
// animación detrás no es una transición, es un retraso.
export function sinMovimiento() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
